import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Download,
  FileText,
  Activity,
  TrendingUp,
  Database,
  Server,
  Search
} from "lucide-react";

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  file?: string;
  meta?: Record<string, unknown>;
}

interface LogStats {
  totalFiles: number;
  totalSize: string;
  totalSizeFormatted: string;
  recentErrors: number;
  recentWarnings: number;
  oldestLog: string;
  newestLog: string;
}

export default function SystemLogs() {
  const { role, loading } = useUserRole();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (!loading && (role === "hr" || role === "manager")) {
      loadRecentLogs();
      loadStats();
    }
  }, [role, loading]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadRecentLogs();
      }, 10000); // Refresh every 10 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadRecentLogs = async () => {
    try {
      setLoadingLogs(true);
      const levelParam = selectedLevel !== 'all' ? `&level=${selectedLevel}` : '';
      const response = await apiClient.get<{ logs: LogEntry[] }>(`/logs/recent?limit=100${levelParam}`);
      setLogs(response.logs);
    } catch (error) {
      console.error('Failed to load logs:', error);
      toast.error('Failed to load logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadErrorLogs = async () => {
    try {
      setLoadingLogs(true);
      const response = await apiClient.get<{ logs: LogEntry[] }>('/logs/errors?limit=100');
      setLogs(response.logs);
    } catch (error) {
      console.error('Failed to load error logs:', error);
      toast.error('Failed to load error logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadProcessLogs = async () => {
    try {
      setLoadingLogs(true);
      const response = await apiClient.get<{ logs: LogEntry[] }>('/logs/processes?limit=100');
      setLogs(response.logs);
    } catch (error) {
      console.error('Failed to load process logs:', error);
      toast.error('Failed to load process logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get<{ stats: LogStats }>('/logs/stats');
      setStats(response.stats);
    } catch (error) {
      console.error('Failed to load log stats:', error);
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getLevelBadge = (level: string) => {
    const variants = {
      error: "destructive",
      warn: "secondary",
      info: "default",
      debug: "outline"
    } as const;

    return (
      <Badge variant={variants[level.toLowerCase() as keyof typeof variants] || "default"} className="gap-1">
        {getLevelIcon(level)}
        {level.toUpperCase()}
      </Badge>
    );
  };

  const filteredLogs = logs.filter(log => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(query) ||
        log.timestamp.includes(query) ||
        JSON.stringify(log.meta || {}).toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (role !== "hr" && role !== "manager") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Logs</h1>
          <p className="text-muted-foreground">Monitor backend processes and errors</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={loadRecentLogs} disabled={loadingLogs}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingLogs ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Log Files</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFiles}</div>
              <p className="text-xs text-muted-foreground">{stats.totalSizeFormatted}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Errors</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.recentErrors}</div>
              <p className="text-xs text-muted-foreground">Last 100 logs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Warnings</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.recentWarnings}</div>
              <p className="text-xs text-muted-foreground">Last 100 logs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Server className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">Healthy</div>
              <p className="text-xs text-muted-foreground">All systems operational</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedLevel} onValueChange={(value) => {
              setSelectedLevel(value);
              loadRecentLogs();
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Log Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Log Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" onClick={loadRecentLogs}>
            <FileText className="h-4 w-4 mr-2" />
            All Logs
          </TabsTrigger>
          <TabsTrigger value="errors" onClick={loadErrorLogs}>
            <AlertCircle className="h-4 w-4 mr-2" />
            Errors
          </TabsTrigger>
          <TabsTrigger value="processes" onClick={loadProcessLogs}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Processes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent System Logs</CardTitle>
              <CardDescription>
                Showing {filteredLogs.length} of {logs.length} log entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full">
                <div className="space-y-2">
                  {filteredLogs.map((log, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                    >
                      {getLevelIcon(log.level)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getLevelBadge(log.level)}
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                          {log.file && (
                            <Badge variant="outline" className="text-xs">
                              {log.file}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium break-words">{log.message}</p>
                        {log.meta && Object.keys(log.meta).length > 0 && (
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.meta, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredLogs.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No logs found matching your criteria</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Error Logs</CardTitle>
              <CardDescription>
                Showing {filteredLogs.filter(l => l.level === 'error').length} error entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full">
                <div className="space-y-2">
                  {filteredLogs.filter(l => l.level === 'error').map((log, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                    >
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                          {log.file && (
                            <Badge variant="outline" className="text-xs">
                              {log.file}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium break-words">{log.message}</p>
                        {log.meta && Object.keys(log.meta).length > 0 && (
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.meta, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredLogs.filter(l => l.level === 'error').length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No error logs found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Process Logs</CardTitle>
              <CardDescription>
                Backend process execution logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full">
                <div className="space-y-2">
                  {filteredLogs.map((log, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                    >
                      <Database className="h-4 w-4 text-blue-500 flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getLevelBadge(log.level)}
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                          {log.meta?.processName && (
                            <Badge variant="outline" className="text-xs">
                              {log.meta.processName as string}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium break-words">{log.message}</p>
                        {log.meta && Object.keys(log.meta).length > 0 && (
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.meta, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredLogs.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No process logs found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
