namespace FirebirdApi.Models
{
    public class ServerConfig
    {
        public string Host { get; set; } = string.Empty;
        public int Port { get; set; } = 3050;
        public string Database { get; set; } = string.Empty;
        public string User { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class ServerStatusRequest
    {
        public ServerConfig ServerA { get; set; } = new();
        public ServerConfig ServerB { get; set; } = new();
    }

    public class ServerStatusResponse
    {
        public ServerStatus ServerA { get; set; } = new();
        public ServerStatus ServerB { get; set; } = new();
        public bool Success { get; set; }
        public string? Message { get; set; }
    }

    public class ServerStatus
    {
        public string Host { get; set; } = string.Empty;
        public bool Online { get; set; }
        public int ResponseTime { get; set; }
        public string? Error { get; set; }
    }

    public class TableInfo
    {
        public string Name { get; set; } = string.Empty;
        public List<ColumnInfo> Columns { get; set; } = new();
    }

    public class ColumnInfo
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public bool Nullable { get; set; }
    }

    public class TablesRequest
    {
        public ServerConfig Config { get; set; } = new();
    }

    public class TablesResponse
    {
        public bool Success { get; set; }
        public List<TableInfo> Tables { get; set; } = new();
        public string? Error { get; set; }
    }

    public class SyncRequest
    {
        public ServerConfig SourceConfig { get; set; } = new();
        public ServerConfig TargetConfig { get; set; } = new();
        public List<string>? TableNames { get; set; }
    }

    public class SyncResponse
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public List<SyncResult> Results { get; set; } = new();
    }

    public class SyncResult
    {
        public string TableName { get; set; } = string.Empty;
        public bool Success { get; set; }
        public int RecordsSynced { get; set; }
        public string? Error { get; set; }
    }
}