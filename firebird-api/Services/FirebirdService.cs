using FirebirdSql.Data.FirebirdClient;
using FirebirdApi.Models;
using System.Data;
using System.Diagnostics;

namespace FirebirdApi.Services
{
    public class FirebirdService
    {
        private readonly ILogger<FirebirdService> _logger;

        public FirebirdService(ILogger<FirebirdService> logger)
        {
            _logger = logger;
        }

        public string BuildConnectionString(ServerConfig config)
        {
            var builder = new FbConnectionStringBuilder
            {
                DataSource = config.Host,
                Port = config.Port,
                Database = config.Database,
                UserID = config.User,
                Password = config.Password,
                ServerType = FbServerType.Default,
                Charset = "UTF8"
            };
            return builder.ConnectionString;
        }

        public async Task<ServerStatus> CheckServerStatusAsync(ServerConfig config)
        {
            var stopwatch = Stopwatch.StartNew();
            var status = new ServerStatus
            {
                Host = $"{config.Host}:{config.Port}"
            };

            try
            {
                _logger.LogInformation("Checking server status for {Host}:{Port}", config.Host, config.Port);
                
                var connectionString = BuildConnectionString(config);
                using var connection = new FbConnection(connectionString);
                
                await connection.OpenAsync();
                
                // Simple test query
                using var command = new FbCommand("SELECT 1 FROM RDB$DATABASE", connection);
                await command.ExecuteScalarAsync();
                
                stopwatch.Stop();
                status.Online = true;
                status.ResponseTime = (int)stopwatch.ElapsedMilliseconds;
                
                _logger.LogInformation("Server {Host}:{Port} is online (Response: {ResponseTime}ms)", 
                    config.Host, config.Port, status.ResponseTime);
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                status.Online = false;
                status.ResponseTime = (int)stopwatch.ElapsedMilliseconds;
                status.Error = ex.Message;
                
                _logger.LogError(ex, "Server {Host}:{Port} check failed", config.Host, config.Port);
            }

            return status;
        }

        public async Task<TablesResponse> GetTablesAsync(ServerConfig config)
        {
            var response = new TablesResponse();
            
            try
            {
                _logger.LogInformation("Getting tables from {Host}:{Port}", config.Host, config.Port);
                
                var connectionString = BuildConnectionString(config);
                using var connection = new FbConnection(connectionString);
                await connection.OpenAsync();

                // Get user tables (not system tables)
                var tablesQuery = @"
                    SELECT DISTINCT r.RDB$RELATION_NAME as TABLE_NAME
                    FROM RDB$RELATIONS r
                    WHERE (r.RDB$SYSTEM_FLAG = 0 OR r.RDB$SYSTEM_FLAG IS NULL)
                    AND r.RDB$RELATION_TYPE = 0
                    ORDER BY r.RDB$RELATION_NAME";

                using var tablesCommand = new FbCommand(tablesQuery, connection);
                using var tablesReader = await tablesCommand.ExecuteReaderAsync();

                var tables = new List<TableInfo>();

                while (await tablesReader.ReadAsync())
                {
                    var tableName = tablesReader["TABLE_NAME"].ToString()?.Trim();
                    if (string.IsNullOrEmpty(tableName)) continue;

                    var tableInfo = new TableInfo { Name = tableName };
                    
                    // Get columns for this table
                    var columnsQuery = @"
                        SELECT 
                            rf.RDB$FIELD_NAME as COLUMN_NAME,
                            f.RDB$FIELD_TYPE as FIELD_TYPE,
                            f.RDB$FIELD_LENGTH as FIELD_LENGTH,
                            f.RDB$FIELD_SCALE as FIELD_SCALE,
                            rf.RDB$NULL_FLAG as NULL_FLAG,
                            f.RDB$FIELD_SUB_TYPE as FIELD_SUB_TYPE
                        FROM RDB$RELATION_FIELDS rf
                        JOIN RDB$FIELDS f ON rf.RDB$FIELD_SOURCE = f.RDB$FIELD_NAME
                        WHERE rf.RDB$RELATION_NAME = @TableName
                        ORDER BY rf.RDB$FIELD_POSITION";

                    using var columnsCommand = new FbCommand(columnsQuery, connection);
                    columnsCommand.Parameters.AddWithValue("@TableName", tableName);
                    using var columnsReader = await columnsCommand.ExecuteReaderAsync();

                    while (await columnsReader.ReadAsync())
                    {
                        var columnName = columnsReader["COLUMN_NAME"].ToString()?.Trim();
                        if (string.IsNullOrEmpty(columnName)) continue;

                        var fieldType = Convert.ToInt32(columnsReader["FIELD_TYPE"]);
                        var fieldLength = columnsReader["FIELD_LENGTH"] != DBNull.Value ? Convert.ToInt32(columnsReader["FIELD_LENGTH"]) : 0;
                        var isNullable = columnsReader["NULL_FLAG"] == DBNull.Value;
                        var subType = columnsReader["FIELD_SUB_TYPE"] != DBNull.Value ? Convert.ToInt32(columnsReader["FIELD_SUB_TYPE"]) : 0;

                        var columnInfo = new ColumnInfo
                        {
                            Name = columnName,
                            Type = MapFirebirdType(fieldType, fieldLength, subType),
                            Nullable = isNullable
                        };

                        tableInfo.Columns.Add(columnInfo);
                    }

                    tables.Add(tableInfo);
                }

                response.Success = true;
                response.Tables = tables;
                
                _logger.LogInformation("Successfully retrieved {Count} tables from {Host}:{Port}", 
                    tables.Count, config.Host, config.Port);
            }
            catch (Exception ex)
            {
                response.Success = false;
                response.Error = ex.Message;
                _logger.LogError(ex, "Failed to get tables from {Host}:{Port}", config.Host, config.Port);
            }

            return response;
        }

        public async Task<SyncResponse> SyncDataAsync(SyncRequest request)
        {
            var response = new SyncResponse();
            var results = new List<SyncResult>();

            try
            {
                _logger.LogInformation("Starting sync from {SourceHost} to {TargetHost}", 
                    request.SourceConfig.Host, request.TargetConfig.Host);

                var sourceConnectionString = BuildConnectionString(request.SourceConfig);
                var targetConnectionString = BuildConnectionString(request.TargetConfig);

                using var sourceConnection = new FbConnection(sourceConnectionString);
                using var targetConnection = new FbConnection(targetConnectionString);

                await sourceConnection.OpenAsync();
                await targetConnection.OpenAsync();

                // If no specific tables provided, get all user tables
                var tablesToSync = request.TableNames;
                if (tablesToSync == null || !tablesToSync.Any())
                {
                    var tablesResponse = await GetTablesAsync(request.SourceConfig);
                    if (tablesResponse.Success)
                    {
                        tablesToSync = tablesResponse.Tables.Select(t => t.Name).ToList();
                    }
                    else
                    {
                        throw new Exception($"Failed to get tables list: {tablesResponse.Error}");
                    }
                }

                foreach (var tableName in tablesToSync)
                {
                    var result = await SyncTableAsync(sourceConnection, targetConnection, tableName);
                    results.Add(result);
                }

                response.Success = results.All(r => r.Success);
                response.Message = response.Success ? "Sync completed successfully" : "Sync completed with errors";
                response.Results = results;

                _logger.LogInformation("Sync completed. Success: {Success}, Tables: {TableCount}", 
                    response.Success, results.Count);
            }
            catch (Exception ex)
            {
                response.Success = false;
                response.Message = ex.Message;
                response.Results = results;
                _logger.LogError(ex, "Sync failed");
            }

            return response;
        }

        private async Task<SyncResult> SyncTableAsync(FbConnection sourceConnection, FbConnection targetConnection, string tableName)
        {
            var result = new SyncResult { TableName = tableName };

            try
            {
                _logger.LogInformation("Syncing table: {TableName}", tableName);

                // Get data from source
                using var sourceCommand = new FbCommand($"SELECT * FROM {tableName}", sourceConnection);
                using var sourceReader = await sourceCommand.ExecuteReaderAsync();

                int recordCount = 0;
                var columns = new List<string>();
                
                // Get column names
                for (int i = 0; i < sourceReader.FieldCount; i++)
                {
                    columns.Add(sourceReader.GetName(i));
                }

                // Prepare insert statement for target
                var columnsStr = string.Join(", ", columns);
                var parametersStr = string.Join(", ", columns.Select(c => $"@{c}"));
                var insertQuery = $"INSERT INTO {tableName} ({columnsStr}) VALUES ({parametersStr})";

                // Clear target table first (optional - you might want to handle this differently)
                using var deleteCommand = new FbCommand($"DELETE FROM {tableName}", targetConnection);
                await deleteCommand.ExecuteNonQueryAsync();

                using var insertCommand = new FbCommand(insertQuery, targetConnection);
                
                // Add parameters
                foreach (var column in columns)
                {
                    insertCommand.Parameters.Add($"@{column}", FbDbType.VarChar);
                }

                while (await sourceReader.ReadAsync())
                {
                    // Set parameter values
                    for (int i = 0; i < columns.Count; i++)
                    {
                        insertCommand.Parameters[$"@{columns[i]}"].Value = sourceReader.IsDBNull(i) ? DBNull.Value : sourceReader.GetValue(i);
                    }

                    await insertCommand.ExecuteNonQueryAsync();
                    recordCount++;
                }

                result.Success = true;
                result.RecordsSynced = recordCount;
                
                _logger.LogInformation("Successfully synced {RecordCount} records for table {TableName}", 
                    recordCount, tableName);
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Error = ex.Message;
                _logger.LogError(ex, "Failed to sync table {TableName}", tableName);
            }

            return result;
        }

        private static string MapFirebirdType(int fieldType, int fieldLength, int subType)
        {
            return fieldType switch
            {
                7 => "SMALLINT",
                8 => "INTEGER",
                16 => "BIGINT",
                10 => "FLOAT",
                27 => "DOUBLE",
                12 => "DATE",
                13 => "TIME",
                35 => "TIMESTAMP",
                14 => subType == 1 ? "CHAR" : $"VARCHAR({fieldLength})",
                37 => subType == 1 ? "CHAR" : $"VARCHAR({fieldLength})",
                261 => "BLOB",
                _ => $"TYPE_{fieldType}" + (fieldLength > 0 ? $"({fieldLength})" : "")
            };
        }
    }
}