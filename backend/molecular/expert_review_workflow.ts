import { api } from "encore.dev/api";

export interface ExpertProfile {
  id: string;
  name: string;
  email: string;
  institution: string;
  expertise: ExpertiseArea[];
  credentials: string[];
  reviewHistory: {
    totalReviews: number;
    averageResponseTime: number;
    lastActive: Date;
  };
  availability: 'available' | 'busy' | 'unavailable';
  securityClearance?: 'confidential' | 'secret' | 'top_secret';
}

export interface ExpertiseArea {
  domain: string;
  subdomains: string[];
  proficiencyLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  yearsExperience: number;
}

export interface ReviewRequest {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reviewType: 'safety_assessment' | 'regulatory_compliance' | 'technical_review' | 'ethics_review' | 'dual_use_research';
  requiredExpertise: string[];
  securityLevel: 'public' | 'restricted' | 'confidential' | 'classified';
  submittedBy: string;
  submittedAt: Date;
  deadline?: Date;
  status: 'pending_assignment' | 'assigned' | 'in_review' | 'consensus_building' | 'completed' | 'escalated';
  attachments: ReviewAttachment[];
  riskFactors?: any[];
  complianceFlags?: string[];
}

export interface ReviewAttachment {
  id: string;
  filename: string;
  type: 'sequence_data' | 'risk_assessment' | 'documentation' | 'research_proposal' | 'other';
  size: number;
  uploadedAt: Date;
  checksum: string;
}

export interface ReviewAssignment {
  id: string;
  requestId: string;
  expertId: string;
  role: 'primary_reviewer' | 'secondary_reviewer' | 'specialist_consultant' | 'ethics_board_member';
  assignedAt: Date;
  acceptedAt?: Date;
  status: 'pending_acceptance' | 'accepted' | 'declined' | 'completed';
  estimatedCompletionTime: string;
}

export interface ExpertReview {
  id: string;
  assignmentId: string;
  expertId: string;
  submittedAt: Date;
  overallRecommendation: 'approve' | 'approve_with_conditions' | 'request_modifications' | 'reject' | 'escalate';
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    specificConcerns: string[];
    mitigationRecommendations: string[];
  };
  detailedComments: ReviewComment[];
  confidenceLevel: number;
  additionalExpertiseRequired?: string[];
  followUpRequired: boolean;
  attachments: ReviewAttachment[];
}

export interface ReviewComment {
  id: string;
  section: string;
  type: 'concern' | 'suggestion' | 'question' | 'approval' | 'technical_note';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  content: string;
  suggestedAction?: string;
  references?: string[];
}

export interface ConsensusSession {
  id: string;
  requestId: string;
  participants: string[];
  scheduledAt: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  type: 'synchronous_meeting' | 'asynchronous_discussion' | 'formal_hearing';
  decisions: ConsensusDecision[];
  finalRecommendation?: string;
}

export interface ConsensusDecision {
  topic: string;
  options: string[];
  votes: { [expertId: string]: string };
  finalDecision: string;
  rationale: string;
}

export interface ReviewMetrics {
  totalRequests: number;
  pendingReviews: number;
  averageReviewTime: number;
  expertUtilization: number;
  escalationRate: number;
  consensusSuccessRate: number;
  reviewQualityScore: number;
}

// Mock data for demonstration
const MOCK_EXPERTS: ExpertProfile[] = [
  {
    id: 'expert_001',
    name: 'Dr. Sarah Chen',
    email: 'sarah.chen@university.edu',
    institution: 'Stanford University',
    expertise: [
      {
        domain: 'Synthetic Biology',
        subdomains: ['Gene circuits', 'Biosafety', 'Metabolic engineering'],
        proficiencyLevel: 'expert',
        yearsExperience: 15
      },
      {
        domain: 'Biosecurity',
        subdomains: ['Dual-use research', 'Risk assessment'],
        proficiencyLevel: 'advanced',
        yearsExperience: 8
      }
    ],
    credentials: ['PhD Bioengineering', 'NIH Biosafety Committee Chair'],
    reviewHistory: {
      totalReviews: 127,
      averageResponseTime: 2.3,
      lastActive: new Date()
    },
    availability: 'available',
    securityClearance: 'secret'
  },
  {
    id: 'expert_002',
    name: 'Prof. James Rodriguez',
    email: 'j.rodriguez@mit.edu',
    institution: 'MIT',
    expertise: [
      {
        domain: 'Regulatory Science',
        subdomains: ['FDA guidelines', 'International compliance', 'Risk framework'],
        proficiencyLevel: 'expert',
        yearsExperience: 20
      }
    ],
    credentials: ['JD/PhD', 'Former FDA Deputy Commissioner', 'International Biosafety Board'],
    reviewHistory: {
      totalReviews: 89,
      averageResponseTime: 1.8,
      lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    availability: 'busy',
    securityClearance: 'top_secret'
  },
  {
    id: 'expert_003',
    name: 'Dr. Maria Petrova',
    email: 'm.petrova@ethz.ch',
    institution: 'ETH Zurich',
    expertise: [
      {
        domain: 'Bioethics',
        subdomains: ['Research ethics', 'Dual-use oversight', 'International policy'],
        proficiencyLevel: 'expert',
        yearsExperience: 12
      }
    ],
    credentials: ['PhD Philosophy', 'Ethics Committee Chair', 'UNESCO Bioethics Advisory'],
    reviewHistory: {
      totalReviews: 156,
      averageResponseTime: 3.1,
      lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    availability: 'available'
  }
];

export interface CreateReviewRequest {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reviewType: 'safety_assessment' | 'regulatory_compliance' | 'technical_review' | 'ethics_review' | 'dual_use_research';
  requiredExpertise: string[];
  securityLevel: 'public' | 'restricted' | 'confidential' | 'classified';
  submittedBy: string;
  deadline?: Date;
  attachments: ReviewAttachment[];
  riskFactors?: any[];
  complianceFlags?: string[];
}

export const submitReviewRequest = api(
  { method: "POST", path: "/expert-review/submit", expose: true },
  async (request: CreateReviewRequest): Promise<ReviewRequest> => {
    const reviewRequest: ReviewRequest = {
      ...request,
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      submittedAt: new Date(),
      status: 'pending_assignment'
    };

    // Simulate automatic expert assignment based on expertise matching
    await assignExpertsToReview(reviewRequest);

    return reviewRequest;
  }
);

export const getExpertPool = api(
  { method: "GET", path: "/expert-review/experts", expose: true },
  async (): Promise<{ experts: ExpertProfile[], metrics: any }> => {
    const metrics = {
      totalExperts: MOCK_EXPERTS.length,
      availableExperts: MOCK_EXPERTS.filter(e => e.availability === 'available').length,
      averageExperience: MOCK_EXPERTS.reduce((sum, e) => 
        sum + Math.max(...e.expertise.map(exp => exp.yearsExperience)), 0
      ) / MOCK_EXPERTS.length,
      domainCoverage: [...new Set(MOCK_EXPERTS.flatMap(e => e.expertise.map(exp => exp.domain)))].length
    };

    return {
      experts: MOCK_EXPERTS,
      metrics
    };
  }
);

export const getReviewQueue = api(
  { method: "GET", path: "/expert-review/queue", expose: true },
  async (): Promise<{ requests: ReviewRequest[], assignments: ReviewAssignment[] }> => {
    // Generate mock review requests
    const mockRequests: ReviewRequest[] = [
      {
        id: 'review_001',
        title: 'High-Risk Synthetic Gene Circuit Safety Assessment',
        description: 'Evaluation of novel gene circuit with potential dual-use applications',
        priority: 'high',
        reviewType: 'safety_assessment',
        requiredExpertise: ['Synthetic Biology', 'Biosafety', 'Dual-use research'],
        securityLevel: 'restricted',
        submittedBy: 'research_team_alpha',
        submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'assigned',
        attachments: [
          {
            id: 'att_001',
            filename: 'gene_circuit_design.gb',
            type: 'sequence_data',
            size: 15420,
            uploadedAt: new Date(),
            checksum: 'sha256:abc123...'
          }
        ],
        riskFactors: [
          { name: 'Pathogenicity', score: 7.2 },
          { name: 'Dual-use potential', score: 8.5 }
        ]
      },
      {
        id: 'review_002',
        title: 'Novel Antimicrobial Peptide Regulatory Compliance',
        description: 'FDA submission preparation for therapeutic antimicrobial peptide',
        priority: 'medium',
        reviewType: 'regulatory_compliance',
        requiredExpertise: ['Regulatory Science', 'Antimicrobial resistance'],
        securityLevel: 'public',
        submittedBy: 'biotech_company_beta',
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'in_review',
        attachments: []
      }
    ];

    const mockAssignments: ReviewAssignment[] = [
      {
        id: 'assign_001',
        requestId: 'review_001',
        expertId: 'expert_001',
        role: 'primary_reviewer',
        assignedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        acceptedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
        status: 'accepted',
        estimatedCompletionTime: '3-5 days'
      },
      {
        id: 'assign_002',
        requestId: 'review_001',
        expertId: 'expert_003',
        role: 'ethics_board_member',
        assignedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        status: 'pending_acceptance',
        estimatedCompletionTime: '2-4 days'
      }
    ];

    return {
      requests: mockRequests,
      assignments: mockAssignments
    };
  }
);

export interface CreateExpertReview {
  assignmentId: string;
  expertId: string;
  overallRecommendation: 'approve' | 'approve_with_conditions' | 'request_modifications' | 'reject' | 'escalate';
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    specificConcerns: string[];
    mitigationRecommendations: string[];
  };
  detailedComments: ReviewComment[];
  confidenceLevel: number;
  additionalExpertiseRequired?: string[];
  followUpRequired: boolean;
  attachments: ReviewAttachment[];
}

export const submitExpertReview = api(
  { method: "POST", path: "/expert-review/submit-review", expose: true },
  async (review: CreateExpertReview): Promise<ExpertReview> => {
    const expertReview: ExpertReview = {
      ...review,
      id: `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      submittedAt: new Date()
    };

    // Check if consensus building is needed
    if (review.overallRecommendation === 'escalate' || review.followUpRequired) {
      await initiateConsensusSession(review.assignmentId);
    }

    return expertReview;
  }
);

export const getReviewMetrics = api(
  { method: "GET", path: "/expert-review/metrics", expose: true },
  async (): Promise<ReviewMetrics> => {
    return {
      totalRequests: 1247,
      pendingReviews: 23,
      averageReviewTime: 4.2, // days
      expertUtilization: 0.73,
      escalationRate: 0.08,
      consensusSuccessRate: 0.94,
      reviewQualityScore: 0.89
    };
  }
);

export const scheduleConsensusSession = api(
  { method: "POST", path: "/expert-review/consensus", expose: true },
  async (req: { 
    requestId: string; 
    participantIds: string[]; 
    scheduledAt: Date;
    type: 'synchronous_meeting' | 'asynchronous_discussion' | 'formal_hearing';
  }): Promise<ConsensusSession> => {
    const session: ConsensusSession = {
      id: `consensus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requestId: req.requestId,
      participants: req.participantIds,
      scheduledAt: req.scheduledAt,
      status: 'scheduled',
      type: req.type,
      decisions: []
    };

    return session;
  }
);

export const getCommunicationHistory = api(
  { method: "GET", path: "/expert-review/communications/:requestId", expose: true },
  async (req: { requestId: string }): Promise<{ 
    messages: any[], 
    documents: any[], 
    meetings: any[] 
  }> => {
    // Mock communication history
    return {
      messages: [
        {
          id: 'msg_001',
          from: 'expert_001',
          to: 'expert_003',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          subject: 'Re: Concerns about gene circuit stability',
          content: 'I agree with your assessment. The stability concerns are significant.',
          type: 'secure_message'
        }
      ],
      documents: [
        {
          id: 'doc_001',
          title: 'Additional Safety Analysis',
          uploadedBy: 'expert_001',
          uploadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          type: 'supplementary_analysis'
        }
      ],
      meetings: [
        {
          id: 'meet_001',
          title: 'Emergency Ethics Review',
          scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          participants: ['expert_001', 'expert_003'],
          type: 'video_conference'
        }
      ]
    };
  }
);

async function assignExpertsToReview(request: ReviewRequest): Promise<void> {
  // Simulate intelligent expert assignment algorithm
  const matchingExperts = MOCK_EXPERTS.filter(expert => {
    const hasRequiredExpertise = request.requiredExpertise.some(reqExp =>
      expert.expertise.some(exp => 
        exp.domain.toLowerCase().includes(reqExp.toLowerCase()) ||
        exp.subdomains.some(sub => sub.toLowerCase().includes(reqExp.toLowerCase()))
      )
    );
    
    const hasSecurityClearance = request.securityLevel === 'classified' ? 
      expert.securityClearance : true;
    
    const isAvailable = expert.availability === 'available';
    
    return hasRequiredExpertise && hasSecurityClearance && isAvailable;
  });

  // Would normally create assignments in database
  console.log(`Assigned ${matchingExperts.length} experts to review ${request.id}`);
}

async function initiateConsensusSession(assignmentId: string): Promise<void> {
  // Simulate consensus session initiation
  console.log(`Initiating consensus session for assignment ${assignmentId}`);
}
