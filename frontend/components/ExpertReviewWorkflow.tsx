import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  MessageSquare,
  Video,
  Shield,
  Star,
  TrendingUp,
  Calendar,
  Download,
  Upload,
  Eye,
  Settings
} from 'lucide-react';
import backend from '~backend/client';
import type { 
  ExpertProfile, 
  ReviewRequest, 
  ReviewAssignment,
  ExpertReview,
  ReviewMetrics,
  ConsensusSession,
  CreateReviewRequest
} from '~backend/molecular/expert_review_workflow';

interface ExpertCardProps {
  expert: ExpertProfile;
}

const ExpertCard: React.FC<ExpertCardProps> = ({ expert }) => {
  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'text-risk-low border-risk-low';
      case 'busy': return 'text-risk-moderate border-risk-moderate';
      case 'unavailable': return 'text-risk-critical border-risk-critical';
      default: return 'text-text-muted border-panel-border';
    }
  };

  const getExperienceLevel = (years: number) => {
    if (years >= 15) return 'Senior Expert';
    if (years >= 10) return 'Expert';
    if (years >= 5) return 'Experienced';
    return 'Junior';
  };

  return (
    <Card className="holographic-panel">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{expert.name}</CardTitle>
            <p className="text-sm text-text-secondary">{expert.institution}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={`${getAvailabilityColor(expert.availability)}`}>
              {expert.availability}
            </Badge>
            {expert.securityClearance && (
              <Badge variant="outline" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                {expert.securityClearance}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium text-accent-cyan text-sm">Expertise Areas</h4>
          <div className="space-y-1">
            {expert.expertise.map((exp, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span>{exp.domain}</span>
                <Badge variant="outline" className="text-xs">
                  {getExperienceLevel(exp.yearsExperience)}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded border border-panel-border">
            <div className="text-lg font-bold text-accent-cyan">
              {expert.reviewHistory.totalReviews}
            </div>
            <div className="text-xs text-text-muted">Reviews</div>
          </div>
          <div className="p-2 rounded border border-panel-border">
            <div className="text-lg font-bold text-accent-teal">
              {expert.reviewHistory.averageResponseTime.toFixed(1)}d
            </div>
            <div className="text-xs text-text-muted">Avg Time</div>
          </div>
          <div className="p-2 rounded border border-panel-border">
            <div className="text-lg font-bold text-risk-low">
              <Star className="w-4 h-4 inline" />
            </div>
            <div className="text-xs text-text-muted">Rating</div>
          </div>
        </div>

        <div className="space-y-1">
          <h4 className="font-medium text-accent-cyan text-sm">Credentials</h4>
          <div className="space-y-1">
            {expert.credentials.slice(0, 2).map((cred, index) => (
              <div key={index} className="text-xs text-text-muted">
                • {cred}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ReviewRequestCard: React.FC<{ request: ReviewRequest; assignments?: ReviewAssignment[] }> = ({ 
  request, 
  assignments = [] 
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'risk-critical';
      case 'high': return 'risk-high';
      case 'medium': return 'risk-moderate';
      default: return 'risk-low';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-risk-low';
      case 'in_review': return 'text-risk-moderate';
      case 'escalated': return 'text-risk-critical';
      default: return 'text-text-secondary';
    }
  };

  const assignedExperts = assignments.filter(a => a.requestId === request.id);

  return (
    <Card className="holographic-panel">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{request.title}</CardTitle>
            <p className="text-sm text-text-secondary mt-1">{request.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={`${getPriorityColor(request.priority)}`}>
              {request.priority} priority
            </Badge>
            <Badge variant="outline" className={getStatusColor(request.status)}>
              {request.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-text-muted">Type:</span>
            <div className="font-medium capitalize">{request.reviewType.replace('_', ' ')}</div>
          </div>
          <div>
            <span className="text-text-muted">Security:</span>
            <div className="font-medium capitalize">{request.securityLevel}</div>
          </div>
          <div>
            <span className="text-text-muted">Submitted:</span>
            <div className="font-medium">{new Date(request.submittedAt).toLocaleDateString()}</div>
          </div>
          <div>
            <span className="text-text-muted">Deadline:</span>
            <div className="font-medium">
              {request.deadline ? new Date(request.deadline).toLocaleDateString() : 'None'}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-accent-cyan text-sm">Required Expertise</h4>
          <div className="flex flex-wrap gap-1">
            {request.requiredExpertise.map((exp, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {exp}
              </Badge>
            ))}
          </div>
        </div>

        {assignedExperts.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-accent-cyan text-sm">Assigned Experts</h4>
            <div className="space-y-1">
              {assignedExperts.map((assignment, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="capitalize">{assignment.role.replace('_', ' ')}</span>
                  <Badge variant={assignment.status === 'accepted' ? 'default' : 'outline'}>
                    {assignment.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {request.attachments.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-accent-cyan text-sm">Attachments</h4>
            <div className="space-y-1">
              {request.attachments.map((attachment, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-text-muted" />
                  <span className="truncate">{attachment.filename}</span>
                  <Badge variant="outline" className="text-xs">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
          <Button variant="outline" size="sm">
            <MessageSquare className="w-4 h-4 mr-2" />
            Communications
          </Button>
          {request.status === 'pending_assignment' && (
            <Button size="sm" className="btn-gradient-primary">
              Assign Experts
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ExpertReviewWorkflow: React.FC = () => {
  const [experts, setExperts] = useState<ExpertProfile[]>([]);
  const [reviewRequests, setReviewRequests] = useState<ReviewRequest[]>([]);
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([]);
  const [metrics, setMetrics] = useState<ReviewMetrics | null>(null);
  const [expertMetrics, setExpertMetrics] = useState<any>(null);
  const [selectedExpert, setSelectedExpert] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');

  // New review request form
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    reviewType: 'safety_assessment' as any,
    requiredExpertise: [] as string[],
    securityLevel: 'public' as any
  });

  useEffect(() => {
    loadExperts();
    loadReviewQueue();
    loadMetrics();
  }, []);

  const loadExperts = async () => {
    try {
      const response = await backend.molecular.getExpertPool();
      setExperts(response.experts);
      setExpertMetrics(response.metrics);
    } catch (error) {
      console.error('Failed to load experts:', error);
    }
  };

  const loadReviewQueue = async () => {
    try {
      const response = await backend.molecular.getReviewQueue();
      setReviewRequests(response.requests);
      setAssignments(response.assignments);
    } catch (error) {
      console.error('Failed to load review queue:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      const metrics = await backend.molecular.getReviewMetrics();
      setMetrics(metrics);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const submitNewRequest = async () => {
    if (!newRequest.title.trim() || !newRequest.description.trim()) return;

    try {
      const requestData: CreateReviewRequest = {
        ...newRequest,
        submittedBy: 'current_user',
        attachments: []
      };
      const request = await backend.molecular.submitReviewRequest(requestData);
      
      setReviewRequests(prev => [request, ...prev]);
      
      // Reset form
      setNewRequest({
        title: '',
        description: '',
        priority: 'medium',
        reviewType: 'safety_assessment',
        requiredExpertise: [],
        securityLevel: 'public'
      });
    } catch (error) {
      console.error('Failed to submit request:', error);
    }
  };

  const addExpertiseToRequest = (expertise: string) => {
    if (expertise && !newRequest.requiredExpertise.includes(expertise)) {
      setNewRequest(prev => ({
        ...prev,
        requiredExpertise: [...prev.requiredExpertise, expertise]
      }));
    }
  };

  const removeExpertiseFromRequest = (expertise: string) => {
    setNewRequest(prev => ({
      ...prev,
      requiredExpertise: prev.requiredExpertise.filter(exp => exp !== expertise)
    }));
  };

  const filteredRequests = reviewRequests.filter(request => {
    if (filterStatus && request.status !== filterStatus) return false;
    if (filterPriority && request.priority !== filterPriority) return false;
    return true;
  });

  const filteredExperts = experts.filter(expert => {
    if (selectedExpert && expert.id !== selectedExpert) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <Card className="holographic-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 glow-text">
            <Users className="w-6 h-6" />
            Expert Review Workflow System
          </CardTitle>
          <p className="text-text-secondary">
            Multi-reviewer assignment, consensus building, and secure communication for high-risk assessments
          </p>
        </CardHeader>
        <CardContent>
          {metrics && expertMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center p-3 rounded border border-panel-border">
                <div className="text-xl font-bold text-accent-cyan">{expertMetrics.totalExperts}</div>
                <div className="text-xs text-text-muted">Total Experts</div>
              </div>
              <div className="text-center p-3 rounded border border-panel-border">
                <div className="text-xl font-bold text-risk-low">{expertMetrics.availableExperts}</div>
                <div className="text-xs text-text-muted">Available</div>
              </div>
              <div className="text-center p-3 rounded border border-panel-border">
                <div className="text-xl font-bold text-accent-teal">{metrics.pendingReviews}</div>
                <div className="text-xs text-text-muted">Pending</div>
              </div>
              <div className="text-center p-3 rounded border border-panel-border">
                <div className="text-xl font-bold text-risk-moderate">{metrics.averageReviewTime.toFixed(1)}d</div>
                <div className="text-xs text-text-muted">Avg Review</div>
              </div>
              <div className="text-center p-3 rounded border border-panel-border">
                <div className="text-xl font-bold text-accent-cyan">{(metrics.expertUtilization * 100).toFixed(0)}%</div>
                <div className="text-xs text-text-muted">Utilization</div>
              </div>
              <div className="text-center p-3 rounded border border-panel-border">
                <div className="text-xl font-bold text-risk-low">{(metrics.reviewQualityScore * 100).toFixed(0)}%</div>
                <div className="text-xs text-text-muted">Quality Score</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="queue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="queue">Review Queue</TabsTrigger>
          <TabsTrigger value="experts">Expert Pool</TabsTrigger>
          <TabsTrigger value="submit">Submit Request</TabsTrigger>
          <TabsTrigger value="consensus">Consensus Sessions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-6">
          <Card className="holographic-panel">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Active Review Requests
                </CardTitle>
                <div className="flex gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="pending_assignment">Pending Assignment</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Priorities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredRequests.map((request, index) => (
                  <ReviewRequestCard 
                    key={index} 
                    request={request} 
                    assignments={assignments}
                  />
                ))}
                {filteredRequests.length === 0 && (
                  <div className="text-center py-8 text-text-muted">
                    No review requests match the current filters.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experts" className="space-y-6">
          <Card className="holographic-panel">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Expert Pool Management
                </CardTitle>
                <div className="flex gap-2">
                  <Select value={selectedExpert} onValueChange={setSelectedExpert}>
                    <SelectTrigger className="w-60">
                      <SelectValue placeholder="Filter by Expert" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Experts</SelectItem>
                      {experts.map(expert => (
                        <SelectItem key={expert.id} value={expert.id}>
                          {expert.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredExperts.map((expert, index) => (
                  <ExpertCard key={index} expert={expert} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submit" className="space-y-6">
          <Card className="holographic-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Submit New Review Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Request Title</label>
                  <Input
                    className="input-sci-fi"
                    placeholder="Enter review request title..."
                    value={newRequest.title}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Priority Level</label>
                  <Select 
                    value={newRequest.priority} 
                    onValueChange={(value: any) => setNewRequest(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="critical">Critical Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Review Type</label>
                  <Select 
                    value={newRequest.reviewType} 
                    onValueChange={(value: any) => setNewRequest(prev => ({ ...prev, reviewType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="safety_assessment">Safety Assessment</SelectItem>
                      <SelectItem value="regulatory_compliance">Regulatory Compliance</SelectItem>
                      <SelectItem value="technical_review">Technical Review</SelectItem>
                      <SelectItem value="ethics_review">Ethics Review</SelectItem>
                      <SelectItem value="dual_use_research">Dual-Use Research</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Security Level</label>
                  <Select 
                    value={newRequest.securityLevel} 
                    onValueChange={(value: any) => setNewRequest(prev => ({ ...prev, securityLevel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="restricted">Restricted</SelectItem>
                      <SelectItem value="confidential">Confidential</SelectItem>
                      <SelectItem value="classified">Classified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Description</label>
                <Textarea
                  className="input-sci-fi h-24 resize-none"
                  placeholder="Provide detailed description of the review request..."
                  value={newRequest.description}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Required Expertise</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newRequest.requiredExpertise.map((exp, index) => (
                    <Badge 
                      key={index} 
                      variant="default" 
                      className="cursor-pointer"
                      onClick={() => removeExpertiseFromRequest(exp)}
                    >
                      {exp} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    className="input-sci-fi flex-1"
                    placeholder="Add expertise area..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addExpertiseToRequest((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="Add expertise area..."]') as HTMLInputElement;
                      if (input?.value) {
                        addExpertiseToRequest(input.value);
                        input.value = '';
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {['Synthetic Biology', 'Biosafety', 'Regulatory Science', 'Bioethics', 'Dual-use research', 'Antimicrobial resistance'].map(exp => (
                    <Button
                      key={exp}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => addExpertiseToRequest(exp)}
                    >
                      + {exp}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={submitNewRequest}
                disabled={!newRequest.title.trim() || !newRequest.description.trim()}
                className="btn-gradient-primary w-full"
              >
                Submit Review Request
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consensus" className="space-y-6">
          <Card className="holographic-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Consensus Building Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Card className="border border-panel-border">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">Emergency Ethics Review</h3>
                        <p className="text-sm text-text-muted">High-risk gene circuit assessment consensus</p>
                      </div>
                      <Badge className="risk-critical">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-text-muted text-sm">Participants:</span>
                        <div className="font-medium">3 experts assigned</div>
                      </div>
                      <div>
                        <span className="text-text-muted text-sm">Scheduled:</span>
                        <div className="font-medium">Tomorrow 2:00 PM</div>
                      </div>
                      <div>
                        <span className="text-text-muted text-sm">Type:</span>
                        <div className="font-medium">Video Conference</div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm">
                        <Calendar className="w-4 h-4 mr-2" />
                        Reschedule
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Discussion
                      </Button>
                      <Button size="sm" className="btn-gradient-primary">
                        <Video className="w-4 h-4 mr-2" />
                        Join Session
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="text-center py-8 text-text-muted">
                  No other consensus sessions scheduled.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="holographic-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Review Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metrics && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Expert Utilization</span>
                        <span className="font-medium">{(metrics.expertUtilization * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={metrics.expertUtilization * 100} className="h-2" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Consensus Success Rate</span>
                        <span className="font-medium">{(metrics.consensusSuccessRate * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={metrics.consensusSuccessRate * 100} className="h-2" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Review Quality Score</span>
                        <span className="font-medium">{(metrics.reviewQualityScore * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={metrics.reviewQualityScore * 100} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="text-center p-3 rounded border border-panel-border">
                        <div className="text-lg font-bold text-accent-cyan">
                          {(metrics.escalationRate * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-text-muted">Escalation Rate</div>
                      </div>
                      <div className="text-center p-3 rounded border border-panel-border">
                        <div className="text-lg font-bold text-accent-teal">
                          {metrics.averageReviewTime.toFixed(1)}d
                        </div>
                        <div className="text-xs text-text-muted">Avg Review Time</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="holographic-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded border border-panel-border">
                    <CheckCircle className="w-5 h-5 text-risk-low" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Review completed</div>
                      <div className="text-xs text-text-muted">Dr. Sarah Chen completed safety assessment</div>
                    </div>
                    <Badge variant="outline" className="text-xs">2h ago</Badge>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded border border-panel-border">
                    <AlertTriangle className="w-5 h-5 text-risk-high" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Escalation triggered</div>
                      <div className="text-xs text-text-muted">High-risk gene circuit flagged for consensus review</div>
                    </div>
                    <Badge variant="outline" className="text-xs">4h ago</Badge>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded border border-panel-border">
                    <Users className="w-5 h-5 text-accent-cyan" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Expert assigned</div>
                      <div className="text-xs text-text-muted">Prof. Rodriguez assigned to regulatory review</div>
                    </div>
                    <Badge variant="outline" className="text-xs">6h ago</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExpertReviewWorkflow;
