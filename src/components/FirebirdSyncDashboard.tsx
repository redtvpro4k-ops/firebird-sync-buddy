import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Database, Clock, Play, TableProperties, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  message: string;
  details: any;
  created_at: string;
}

interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
}

interface DatabaseTable {
  name: string;
  columns: TableColumn[];
}

interface ServerInfo {
  host: string;
  success: boolean;
  tables: DatabaseTable[];
  error?: string;
}

export function FirebirdSyncDashboard() {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [tablesData, setTablesData] = useState<{ serverA: ServerInfo; serverB: ServerInfo } | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const { toast } = useToast();

  const fetchTablesInfo = async () => {
    setLoadingTables(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-firebird', {
        body: { action: 'tables' }
      });

      if (error) throw error;

      if (data.success) {
        setTablesData(data.data);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error fetching tables info:', error);
      toast({
        title: "Error",
        description: "Failed to fetch database tables information",
        variant: "destructive",
      });
    } finally {
      setLoadingTables(false);
    }
  };

  const fetchSyncLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSyncLogs(data || []);
    } catch (error) {
      console.error('Error fetching sync logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sync logs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const triggerManualSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-firebird', {
        body: { trigger: 'manual', timestamp: new Date().toISOString() }
      });

      if (error) throw error;

      toast({
        title: "Sync Triggered",
        description: "Manual synchronization has been started",
      });

      // Refresh logs after a delay
      setTimeout(() => {
        fetchSyncLogs();
      }, 2000);

    } catch (error) {
      console.error('Error triggering sync:', error);
      toast({
        title: "Error",
        description: "Failed to trigger manual sync",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchSyncLogs();
    fetchTablesInfo();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'running':
        return <Badge variant="secondary">Running</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Firebird Database Sync</h1>
          <p className="text-muted-foreground">
            Monitor and control synchronization between Server A and Server B
          </p>
        </div>
      </div>

      {/* Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Synchronization Control
          </CardTitle>
          <CardDescription>
            Automatic sync runs daily at 2:00 AM. You can also trigger manual synchronization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={triggerManualSync} disabled={isSyncing}>
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isSyncing ? 'Syncing...' : 'Run Manual Sync'}
            </Button>
            <Button variant="outline" onClick={fetchSyncLogs} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Logs
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Server A</span>
                </div>
                <p className="text-xs text-muted-foreground">179.51.69.249:3050</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl">→</div>
                <p className="text-xs text-muted-foreground">Unidirectional Sync</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Server B</span>
                </div>
                <p className="text-xs text-muted-foreground">63.141.253.138:3050</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Database Tables Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableProperties className="h-5 w-5" />
            Database Tables
          </CardTitle>
          <CardDescription>
            View and compare table structures from both Firebird servers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Button variant="outline" onClick={fetchTablesInfo} disabled={loadingTables}>
              {loadingTables ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {loadingTables ? 'Loading...' : 'View Tables'}
            </Button>
          </div>

          {tablesData ? (
            <Tabs defaultValue="serverA" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="serverA">
                  Server A ({tablesData.serverA.host})
                </TabsTrigger>
                <TabsTrigger value="serverB">
                  Server B ({tablesData.serverB.host})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="serverA" className="space-y-4">
                {tablesData.serverA.success ? (
                  <div className="space-y-4">
                    {tablesData.serverA.tables.map((table) => (
                      <Card key={table.name}>
                        <CardHeader>
                          <CardTitle className="text-lg">{table.name}</CardTitle>
                          <CardDescription>
                            {table.columns.length} columns
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Column Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Nullable</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {table.columns.map((column) => (
                                <TableRow key={column.name}>
                                  <TableCell className="font-medium">{column.name}</TableCell>
                                  <TableCell>{column.type}</TableCell>
                                  <TableCell>
                                    <Badge variant={column.nullable ? "secondary" : "outline"}>
                                      {column.nullable ? "Yes" : "No"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Failed to load Server A tables</p>
                    {tablesData.serverA.error && (
                      <p className="text-sm text-destructive">{tablesData.serverA.error}</p>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="serverB" className="space-y-4">
                {tablesData.serverB.success ? (
                  <div className="space-y-4">
                    {tablesData.serverB.tables.map((table) => (
                      <Card key={table.name}>
                        <CardHeader>
                          <CardTitle className="text-lg">{table.name}</CardTitle>
                          <CardDescription>
                            {table.columns.length} columns
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Column Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Nullable</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {table.columns.map((column) => (
                                <TableRow key={column.name}>
                                  <TableCell className="font-medium">{column.name}</TableCell>
                                  <TableCell>{column.type}</TableCell>
                                  <TableCell>
                                    <Badge variant={column.nullable ? "secondary" : "outline"}>
                                      {column.nullable ? "Yes" : "No"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Failed to load Server B tables</p>
                    {tablesData.serverB.error && (
                      <p className="text-sm text-destructive">{tablesData.serverB.error}</p>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TableProperties className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No table information loaded</p>
              <p className="text-sm">Click "View Tables" to load database schemas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Sync History
          </CardTitle>
          <CardDescription>
            Recent synchronization operations and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sync operations recorded yet</p>
              <p className="text-sm">Try running a manual sync to see logs here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {syncLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(log.status)}
                      <span className="text-sm font-medium">{log.message}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                    {log.details && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View Details
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}