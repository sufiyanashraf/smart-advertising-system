import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  Trash2, 
  BarChart3, 
  Users, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  Lock,
  Lightbulb,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EvaluationSession,
  GroundTruthEntry,
  EvaluationMetrics,
  ConfusionMatrix,
  calculateMetrics,
  calculateConfusionMatrix,
} from '@/types/evaluation';

const STORAGE_KEY = 'smartads-evaluation-sessions';
const AUTH_KEY = 'smartads-admin-authenticated';
const ADMIN_PASSCODE = 'smartads1234';

const ModelEvaluation = () => {
  const [sessions, setSessions] = useState<EvaluationSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
  const [confusionMatrix, setConfusionMatrix] = useState<ConfusionMatrix | null>(null);
  
  // Passcode protection
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasscodeDialog, setShowPasscodeDialog] = useState(true);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  
  // New session dialog
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');

  // Check authentication on mount
  useEffect(() => {
    const authed = sessionStorage.getItem(AUTH_KEY);
    if (authed === 'true') {
      setIsAuthenticated(true);
      setShowPasscodeDialog(false);
    }
  }, []);

  // Handle passcode submission
  const handlePasscodeSubmit = () => {
    if (passcodeInput === ADMIN_PASSCODE) {
      setIsAuthenticated(true);
      setShowPasscodeDialog(false);
      sessionStorage.setItem(AUTH_KEY, 'true');
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  };

  // Load sessions from localStorage
  const loadSessions = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: EvaluationSession[] = JSON.parse(saved);
        // Sort by createdAt descending (newest first)
        parsed.sort((a, b) => b.createdAt - a.createdAt);
        setSessions(parsed);
        if (parsed.length > 0 && !activeSessionId) {
          setActiveSessionId(parsed[0].id);
        }
      } catch {
        console.error('Failed to load evaluation sessions');
      }
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadSessions();
  }, [isAuthenticated, loadSessions]);

  // Listen for evaluation updates from SmartAdsSystem labeling
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const handleUpdate = () => {
      loadSessions();
    };
    
    window.addEventListener('smartads-evaluation-updated', handleUpdate);
    return () => window.removeEventListener('smartads-evaluation-updated', handleUpdate);
  }, [isAuthenticated, loadSessions]);

  // Calculate metrics when active session changes
  useEffect(() => {
    if (activeSessionId) {
      const session = sessions.find(s => s.id === activeSessionId);
      if (session && session.entries.length > 0) {
        setMetrics(calculateMetrics(session.entries));
        setConfusionMatrix(calculateConfusionMatrix(session.entries));
      } else {
        setMetrics(null);
        setConfusionMatrix(null);
      }
    }
  }, [activeSessionId, sessions]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const allEntries = sessions.flatMap(s => s.entries);
  const allMetrics = allEntries.length > 0 ? calculateMetrics(allEntries) : null;

  // Create new session
  const handleCreateSession = useCallback(() => {
    const name = newSessionName.trim() || `Session ${new Date().toLocaleDateString()}`;
    const newSession: EvaluationSession = {
      id: `session_${Date.now()}`,
      name,
      createdAt: Date.now(),
      entries: [],
    };
    
    const updated = [newSession, ...sessions];
    setSessions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setActiveSessionId(newSession.id);
    setShowNewSessionDialog(false);
    setNewSessionName('');
  }, [newSessionName, sessions]);

  const handleExportCSV = useCallback(() => {
    if (!activeSession) return;
    
    const headers = [
      'ID', 'Timestamp', 'Detected Gender', 'Actual Gender', 
      'Detected Age', 'Actual Age', 'Confidence', 'Face Score', 'False Positive'
    ];
    
    const rows = activeSession.entries.map(e => [
      e.id,
      new Date(e.timestamp).toISOString(),
      e.detectedGender,
      e.actualGender,
      e.detectedAgeGroup,
      e.actualAgeGroup,
      e.detectedConfidence.toFixed(2),
      e.detectedFaceScore.toFixed(2),
      e.isFalsePositive ? 'Yes' : 'No',
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `evaluation-${activeSession.name}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeSession]);

  const handleClearSession = useCallback(() => {
    if (!activeSessionId) return;
    
    const updated = sessions.map(s => 
      s.id === activeSessionId ? { ...s, entries: [] } : s
    );
    setSessions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [activeSessionId, sessions]);

  const handleDeleteSession = useCallback(() => {
    if (!activeSessionId) return;
    
    const updated = sessions.filter(s => s.id !== activeSessionId);
    setSessions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setActiveSessionId(updated.length > 0 ? updated[0].id : null);
  }, [activeSessionId, sessions]);

  const handleDeleteEntry = useCallback((entryId: string) => {
    if (!activeSessionId) return;
    
    const updated = sessions.map(s => 
      s.id === activeSessionId 
        ? { ...s, entries: s.entries.filter(e => e.id !== entryId) }
        : s
    );
    setSessions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [activeSessionId, sessions]);

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  
  // Generate recommendations based on metrics
  const getRecommendations = (): { text: string; type: 'warning' | 'success' | 'info' }[] => {
    if (!metrics || metrics.totalSamples < 5) return [];
    
    const recs: { text: string; type: 'warning' | 'success' | 'info' }[] = [];
    
    if (metrics.femaleRecall < 0.7) {
      recs.push({
        text: `Female recall is low (${formatPercent(metrics.femaleRecall)}). Try increasing the Female Boost Factor to 0.15-0.25.`,
        type: 'warning'
      });
    }
    
    if (metrics.falsePositiveRate > 0.1) {
      recs.push({
        text: `High false positive rate (${formatPercent(metrics.falsePositiveRate)}). Increase False Positive Guard to 0.20-0.30.`,
        type: 'warning'
      });
    }
    
    if (metrics.genderAccuracy > 0.85) {
      recs.push({
        text: `Gender accuracy is good (${formatPercent(metrics.genderAccuracy)}). Current settings are working well.`,
        type: 'success'
      });
    }
    
    if (metrics.avgConfidenceIncorrect > 0.7) {
      recs.push({
        text: `Model is confident but wrong. Consider enabling Hair Heuristics for additional signals.`,
        type: 'info'
      });
    }
    
    if (metrics.ageAccuracy < 0.6) {
      recs.push({
        text: `Age classification needs improvement. This is a known limitation - focus on gender accuracy.`,
        type: 'info'
      });
    }
    
    return recs;
  };

  // Passcode dialog
  if (!isAuthenticated) {
    return (
      <Dialog open={showPasscodeDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Admin Access Required
            </DialogTitle>
            <DialogDescription>
              Enter the admin passcode to access the Model Evaluation Dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="passcode">Passcode</Label>
              <Input
                id="passcode"
                type="password"
                placeholder="Enter admin passcode"
                value={passcodeInput}
                onChange={(e) => {
                  setPasscodeInput(e.target.value);
                  setPasscodeError(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handlePasscodeSubmit()}
                className={passcodeError ? 'border-destructive' : ''}
              />
              {passcodeError && (
                <p className="text-sm text-destructive">Incorrect passcode. Please try again.</p>
              )}
            </div>
            <div className="flex gap-3">
              <Link to="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <Button onClick={handlePasscodeSubmit} className="flex-1">
                Unlock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-display font-bold">Model Evaluation Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Analyze detection accuracy and demographic classification performance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Lock className="h-3 w-3 mr-1" />
              Admin Only
            </Badge>
          </div>
        </div>

        {/* Session Selector */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Session Management</CardTitle>
              <Button 
                size="sm" 
                onClick={() => setShowNewSessionDialog(true)}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                New Session
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <Select value={activeSessionId || ''} onValueChange={setActiveSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">📊 All Sessions Combined ({allEntries.length} entries)</SelectItem>
                    {sessions.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.entries.length} entries)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportCSV}
                disabled={!activeSession || activeSession.entries.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleClearSession}
                disabled={!activeSession || activeSessionId === '__all__'}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteSession}
                disabled={!activeSession || activeSessionId === '__all__'}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Total Samples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {activeSessionId === '__all__' ? allEntries.length : (activeSession?.entries.length || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {activeSessionId === '__all__' 
                  ? `Across ${sessions.length} sessions`
                  : activeSession ? `In ${activeSession.name}` : 'No session selected'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Gender Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {(activeSessionId === '__all__' ? allMetrics : metrics)
                  ? formatPercent((activeSessionId === '__all__' ? allMetrics : metrics)!.genderAccuracy)
                  : 'N/A'}
              </div>
              <Progress 
                value={(activeSessionId === '__all__' ? allMetrics : metrics)
                  ? (activeSessionId === '__all__' ? allMetrics : metrics)!.genderAccuracy * 100 
                  : 0} 
                className="h-2 mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Female Recall
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {(activeSessionId === '__all__' ? allMetrics : metrics)
                  ? formatPercent((activeSessionId === '__all__' ? allMetrics : metrics)!.femaleRecall)
                  : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                % of females correctly detected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                False Positive Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {(activeSessionId === '__all__' ? allMetrics : metrics)
                  ? formatPercent((activeSessionId === '__all__' ? allMetrics : metrics)!.falsePositiveRate)
                  : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Non-face detections
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        {getRecommendations().length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getRecommendations().map((rec, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-start gap-2 p-2 rounded-md text-sm ${
                      rec.type === 'warning' ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
                      rec.type === 'success' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                      'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                    }`}
                  >
                    {rec.type === 'warning' ? <TrendingDown className="h-4 w-4 mt-0.5 flex-shrink-0" /> :
                     rec.type === 'success' ? <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" /> :
                     <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                    {rec.text}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gender Confusion Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gender Confusion Matrix</CardTitle>
              <CardDescription>
                Rows = Predicted, Columns = Actual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(activeSessionId === '__all__' ? calculateConfusionMatrix(allEntries) : confusionMatrix) ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead className="text-center">Actual Male</TableHead>
                      <TableHead className="text-center">Actual Female</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const cm = activeSessionId === '__all__' ? calculateConfusionMatrix(allEntries) : confusionMatrix;
                      return (
                        <>
                          <TableRow>
                            <TableCell className="font-medium">Predicted Male</TableCell>
                            <TableCell className="text-center bg-green-500/10">
                              <span className="font-bold text-green-600">
                                {cm!.gender.maleAsMale}
                              </span>
                            </TableCell>
                            <TableCell className="text-center bg-destructive/10">
                              <span className="font-bold text-destructive">
                                {cm!.gender.maleAsFemale}
                              </span>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Predicted Female</TableCell>
                            <TableCell className="text-center bg-destructive/10">
                              <span className="font-bold text-destructive">
                                {cm!.gender.femaleAsMale}
                              </span>
                            </TableCell>
                            <TableCell className="text-center bg-green-500/10">
                              <span className="font-bold text-green-600">
                                {cm!.gender.femaleAsFemale}
                              </span>
                            </TableCell>
                          </TableRow>
                        </>
                      );
                    })()}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No evaluation data yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Age Confusion Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Age Group Confusion Matrix</CardTitle>
              <CardDescription>
                Rows = Predicted, Columns = Actual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(activeSessionId === '__all__' ? calculateConfusionMatrix(allEntries) : confusionMatrix) ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead className="text-center">Kid</TableHead>
                      <TableHead className="text-center">Young</TableHead>
                      <TableHead className="text-center">Adult</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const cm = activeSessionId === '__all__' ? calculateConfusionMatrix(allEntries) : confusionMatrix;
                      return (
                        <>
                          <TableRow>
                            <TableCell className="font-medium">Pred. Kid</TableCell>
                            <TableCell className="text-center bg-green-500/10">
                              {cm!.age.kidAsKid}
                            </TableCell>
                            <TableCell className="text-center">
                              {cm!.age.kidAsYoung}
                            </TableCell>
                            <TableCell className="text-center">
                              {cm!.age.kidAsAdult}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Pred. Young</TableCell>
                            <TableCell className="text-center">
                              {cm!.age.youngAsKid}
                            </TableCell>
                            <TableCell className="text-center bg-green-500/10">
                              {cm!.age.youngAsYoung}
                            </TableCell>
                            <TableCell className="text-center">
                              {cm!.age.youngAsAdult}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Pred. Adult</TableCell>
                            <TableCell className="text-center">
                              {cm!.age.adultAsKid}
                            </TableCell>
                            <TableCell className="text-center">
                              {cm!.age.adultAsYoung}
                            </TableCell>
                            <TableCell className="text-center bg-green-500/10">
                              {cm!.age.adultAsAdult}
                            </TableCell>
                          </TableRow>
                        </>
                      );
                    })()}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No evaluation data yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detailed Performance Metrics</CardTitle>
            <CardDescription>
              Precision, recall, and accuracy breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const m = activeSessionId === '__all__' ? allMetrics : metrics;
              return m && m.totalSamples > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Male Precision</p>
                    <p className="text-xl font-bold">{formatPercent(m.malePrecision)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Male Recall</p>
                    <p className="text-xl font-bold">{formatPercent(m.maleRecall)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Female Precision</p>
                    <p className="text-xl font-bold">{formatPercent(m.femalePrecision)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Female Recall</p>
                    <p className="text-xl font-bold">{formatPercent(m.femaleRecall)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Age Accuracy</p>
                    <p className="text-xl font-bold">{formatPercent(m.ageAccuracy)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Kid Accuracy</p>
                    <p className="text-xl font-bold">{formatPercent(m.kidAccuracy)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Young Accuracy</p>
                    <p className="text-xl font-bold">{formatPercent(m.youngAccuracy)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Adult Accuracy</p>
                    <p className="text-xl font-bold">{formatPercent(m.adultAccuracy)}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-muted-foreground">Avg Confidence (Correct)</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatPercent(m.avgConfidenceCorrect)}
                    </p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-muted-foreground">Avg Confidence (Incorrect)</p>
                    <p className="text-xl font-bold text-destructive">
                      {formatPercent(m.avgConfidenceIncorrect)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No evaluation data available. Label detections from the dashboard to collect ground truth.
                  </p>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Recent Entries */}
        {activeSession && activeSession.entries.length > 0 && activeSessionId !== '__all__' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Labeled Entries</CardTitle>
              <CardDescription>
                Last 10 entries in current session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Detected</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSession.entries.slice(-10).reverse().map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        {entry.detectedGender === 'male' ? '♂' : '♀'} {entry.detectedAgeGroup}
                      </TableCell>
                      <TableCell>
                        {entry.isFalsePositive ? (
                          <Badge variant="destructive">Not Face</Badge>
                        ) : (
                          <>{entry.actualGender === 'male' ? '♂' : '♀'} {entry.actualAgeGroup}</>
                        )}
                      </TableCell>
                      <TableCell>{(entry.detectedConfidence * 100).toFixed(0)}%</TableCell>
                      <TableCell>
                        {entry.isFalsePositive ? (
                          <Badge variant="destructive">FP</Badge>
                        ) : entry.detectedGender === entry.actualGender ? (
                          <Badge variant="default" className="bg-green-600">✓</Badge>
                        ) : (
                          <Badge variant="destructive">✗</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleDeleteEntry(entry.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>1. Enable Label Mode:</strong> From the main dashboard, toggle the "Label" switch 
              in the header. This adds labeling buttons to each detected face.
            </p>
            <p>
              <strong>2. Label Detections:</strong> For each detected face, click "Label This Face" to open
              the labeling form. Select the correct gender and age group, or mark as "Not a real face" for
              false positives. Click "Save" to record the ground truth.
            </p>
            <p>
              <strong>3. Analyze Results:</strong> Return here to view accuracy metrics, 
              confusion matrices, and get recommendations for improving detection.
            </p>
            <p>
              <strong>4. Tune Settings:</strong> Use the recommendations to adjust detection sensitivity, 
              female boost factor, and false positive thresholds on the main dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* New Session Dialog */}
      <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Session</DialogTitle>
            <DialogDescription>
              Start a new evaluation session to collect ground truth data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="session-name">Session Name</Label>
              <Input
                id="session-name"
                placeholder={`Session ${new Date().toLocaleDateString()}`}
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowNewSessionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSession}>
                Create Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModelEvaluation;
