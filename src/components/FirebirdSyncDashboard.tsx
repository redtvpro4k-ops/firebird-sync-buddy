import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RefreshCw, Database, Clock, Play, TableProperties, Eye, Settings, Wifi, WifiOff, Server } from 'lucide-react';
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

interface ServerStatus {
  host: string;
  online: boolean;
  responseTime?: number;
  error?: string;
}

interface ServerConfig {
  host: string;
  port: string;
  user: string;
  password: string;
}

export function FirebirdSyncDashboard() {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [tablesData, setTablesData] = useState<{ serverA: ServerInfo; serverB: ServerInfo } | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [serverStatus, setServerStatus] = useState<{ serverA: ServerStatus; serverB: ServerStatus } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<'A' | 'B'>('A');
  const [serverConfigs, setServerConfigs] = useState<{
    serverA: ServerConfig;
    serverB: ServerConfig;
  }>({
    serverA: { host: '179.51.69.249', port: '3050', user: 'sysdba', password: '' },
    serverB: { host: '63.141.253.138', port: '3050', user: 'sysdba', password: '' }
  });
  const { toast } = useToast();

  const checkServerStatus = async () => {
    setCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-firebird', {
        body: { action: 'status' }
      });

      if (error) throw error;

      if (data.success) {
        setServerStatus(data.data);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error checking server status:', error);
      toast({
        title: "Error",
        description: "Failed to check server status",
        variant: "destructive",
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const updateServerConfig = async (server: 'A' | 'B', config: ServerConfig) => {
    try {
      // Update the corresponding secrets
      const secretPrefix = server === 'A' ? 'FIREBIRD_A' : 'FIREBIRD_B';
      
      // Note: In a real implementation, you would need to call individual secret update functions
      // For now, we'll just update the local state and show a message
      setServerConfigs(prev => ({
        ...prev,
        [`server${server}`]: config
      }));

      toast({
        title: "Configuration Updated",
        description: `Server ${server} configuration has been updated locally. Please update the secrets in Supabase manually.`,
      });
      
      setConfigDialogOpen(false);
    } catch (error) {
      console.error('Error updating server config:', error);
      toast({
        title: "Error",
        description: "Failed to update server configuration",
        variant: "destructive",
      });
    }
  };

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
    // Temporarily disabled - sync_logs table doesn't exist yet
    // setIsLoading(true);
    // try {
    //   const { data, error } = await supabase
    //     .from('sync_logs')
    //     .select('*')
    //     .order('created_at', { ascending: false })
    //     .limit(10);

    //   if (error) throw error;
    //   setSyncLogs(data || []);
    // } catch (error) {
    //   console.error('Error fetching sync logs:', error);
    //   toast({
    //     title: "Error",
    //     description: "Failed to fetch sync logs",
    //     variant: "destructive",
    //   });
    // } finally {
    //   setIsLoading(false);
    // }
    setSyncLogs([]);
    setIsLoading(false);
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

      // Refresh logs after a delay (temporarily disabled)
      // setTimeout(() => {
      //   fetchSyncLogs();
      // }, 2000);

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
    // fetchSyncLogs(); // Temporarily disabled
    fetchTablesInfo();
    checkServerStatus();
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

      {/* Server Status and Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Server Status & Configuration
          </CardTitle>
          <CardDescription>
            Monitor server connections and update configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 mb-4">
            <Button variant="outline" onClick={checkServerStatus} disabled={checkingStatus}>
              {checkingStatus ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {checkingStatus ? 'Checking...' : 'Check Status'}
            </Button>
            
            <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Servers
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Server Configuration</DialogTitle>
                  <DialogDescription>
                    Update the connection settings for Firebird servers
                  </DialogDescription>
                </DialogHeader>
                <Tabs value={`server${selectedServer}`} onValueChange={(value) => setSelectedServer(value.slice(-1) as 'A' | 'B')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="serverA">Server A</TabsTrigger>
                    <TabsTrigger value="serverB">Server B</TabsTrigger>
                  </TabsList>
                  <TabsContent value="serverA" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="hostA">Host</Label>
                      <Input
                        id="hostA"
                        value={serverConfigs.serverA.host}
                        onChange={(e) => setServerConfigs(prev => ({
                          ...prev,
                          serverA: { ...prev.serverA, host: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portA">Port</Label>
                      <Input
                        id="portA"
                        value={serverConfigs.serverA.port}
                        onChange={(e) => setServerConfigs(prev => ({
                          ...prev,
                          serverA: { ...prev.serverA, port: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="userA">User</Label>
                      <Input
                        id="userA"
                        value={serverConfigs.serverA.user}
                        onChange={(e) => setServerConfigs(prev => ({
                          ...prev,
                          serverA: { ...prev.serverA, user: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passwordA">Password</Label>
                      <Input
                        id="passwordA"
                        type="password"
                        value={serverConfigs.serverA.password}
                        onChange={(e) => setServerConfigs(prev => ({
                          ...prev,
                          serverA: { ...prev.serverA, password: e.target.value }
                        }))}
                      />
                    </div>
                    <Button onClick={() => updateServerConfig('A', serverConfigs.serverA)}>
                      Update Server A
                    </Button>
                  </TabsContent>
                  <TabsContent value="serverB" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="hostB">Host</Label>
                      <Input
                        id="hostB"
                        value={serverConfigs.serverB.host}
                        onChange={(e) => setServerConfigs(prev => ({
                          ...prev,
                          serverB: { ...prev.serverB, host: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portB">Port</Label>
                      <Input
                        id="portB"
                        value={serverConfigs.serverB.port}
                        onChange={(e) => setServerConfigs(prev => ({
                          ...prev,
                          serverB: { ...prev.serverB, port: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="userB">User</Label>
                      <Input
                        id="userB"
                        value={serverConfigs.serverB.user}
                        onChange={(e) => setServerConfigs(prev => ({
                          ...prev,
                          serverB: { ...prev.serverB, user: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passwordB">Password</Label>
                      <Input
                        id="passwordB"
                        type="password"
                        value={serverConfigs.serverB.password}
                        onChange={(e) => setServerConfigs(prev => ({
                          ...prev,
                          serverB: { ...prev.serverB, password: e.target.value }
                        }))}
                      />
                    </div>
                    <Button onClick={() => updateServerConfig('B', serverConfigs.serverB)}>
                      Update Server B
                    </Button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>

          {serverStatus ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Server A</span>
                    </div>
                    {serverStatus.serverA.online ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <Wifi className="h-4 w-4" />
                        <Badge variant="secondary" className="bg-green-100 text-green-800">Online</Badge>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-600">
                        <WifiOff className="h-4 w-4" />
                        <Badge variant="destructive">Offline</Badge>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{serverStatus.serverA.host}</p>
                  {serverStatus.serverA.responseTime && (
                    <p className="text-xs text-muted-foreground">Response: {serverStatus.serverA.responseTime}ms</p>
                  )}
                  {serverStatus.serverA.error && (
                    <p className="text-xs text-destructive mt-1">{serverStatus.serverA.error}</p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Server B</span>
                    </div>
                    {serverStatus.serverB.online ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <Wifi className="h-4 w-4" />
                        <Badge variant="secondary" className="bg-green-100 text-green-800">Online</Badge>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-600">
                        <WifiOff className="h-4 w-4" />
                        <Badge variant="destructive">Offline</Badge>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{serverStatus.serverB.host}</p>
                  {serverStatus.serverB.responseTime && (
                    <p className="text-xs text-muted-foreground">Response: {serverStatus.serverB.responseTime}ms</p>
                  )}
                  {serverStatus.serverB.error && (
                    <p className="text-xs text-destructive mt-1">{serverStatus.serverB.error}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No server status information</p>
              <p className="text-sm">Click "Check Status" to verify server connections</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database Tables - Server A */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableProperties className="h-5 w-5" />
            Database Tables - Server A
            {serverStatus?.serverA && (
              serverStatus.serverA.online ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800 ml-2">Online</Badge>
              ) : (
                <Badge variant="destructive" className="ml-2">Offline</Badge>
              )
            )}
          </CardTitle>
          <CardDescription>
            View table structures from Server A ({serverConfigs.serverA.host}:{serverConfigs.serverA.port})
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
              {loadingTables ? 'Loading...' : 'Load Server A Tables'}
            </Button>
          </div>

          {tablesData?.serverA ? (
            tablesData.serverA.success ? (
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
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TableProperties className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No table information loaded for Server A</p>
              <p className="text-sm">Click "Load Server A Tables" to load database schema</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database Tables - Server B */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableProperties className="h-5 w-5" />
            Database Tables - Server B
            {serverStatus?.serverB && (
              serverStatus.serverB.online ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800 ml-2">Online</Badge>
              ) : (
                <Badge variant="destructive" className="ml-2">Offline</Badge>
              )
            )}
          </CardTitle>
          <CardDescription>
            View table structures from Server B ({serverConfigs.serverB.host}:{serverConfigs.serverB.port})
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
              {loadingTables ? 'Loading...' : 'Load Server B Tables'}
            </Button>
          </div>

          {tablesData?.serverB ? (
            tablesData.serverB.success ? (
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
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TableProperties className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No table information loaded for Server B</p>
              <p className="text-sm">Click "Load Server B Tables" to load database schema</p>
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