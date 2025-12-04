import { FirstAidTopic, Report, Resource, Story, Symptom, UserProfile, VetAIResult } from './types';

export const URGENT_STORIES: Story[] = [
  { 
    id: 's1', 
    title: 'Puppy Hit', 
    location: 'Andheri Metro', 
    time: '5m ago', 
    tag: 'Accident',
    img: 'https://images.unsplash.com/photo-1598133894008-61f7fdb8cc3a?auto=format&fit=crop&w=400&q=80' 
  },
  { 
    id: 's2', 
    title: 'Starving Cat', 
    location: 'Mahim', 
    time: '12m ago', 
    tag: 'Starving',
    img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80' 
  },
  { 
    id: 's3', 
    title: 'Injured Cow', 
    location: 'Sion', 
    time: '20m ago', 
    tag: 'Injured',
    img: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=400&q=80' 
  },
  { 
    id: 's4', 
    title: 'Sick Dog', 
    location: 'Bandra', 
    time: '1h ago', 
    tag: 'Sick',
    img: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=400&q=80' 
  },
];

export const FEED_ITEMS: Report[] = []; 

export const NEARBY_RESOURCES: Resource[] = [
  { id: 1, name: 'Happy Tails Vet Clinic', type: 'VET', dist: '0.5 km', phone: '+91 98200 12345', mapPos: { top: '30%', left: '40%' } },
  { id: 2, name: 'IDA India Ambulance', type: 'NGO', dist: '2.1 km', phone: '+91 93200 56789', mapPos: { top: '60%', left: '20%' } },
  { id: 3, name: 'Dr. Kolekar\'s Pet Clinic', type: 'VET', dist: '1.2 km', phone: '+91 98670 54321', mapPos: { top: '45%', left: '75%' } },
  { id: 4, name: 'Save Our Strays (SOS)', type: 'NGO', dist: '3.5 km', phone: '+91 98201 23456', mapPos: { top: '15%', left: '60%' } },
];

export const SYMPTOMS_LIST: Symptom[] = [
  { id: 'sym1', label: 'Limping', icon: '🦿' },
  { id: 'sym2', label: 'Bleeding', icon: '🩸' },
  { id: 'sym3', label: 'Vomiting', icon: '🤮' },
  { id: 'sym4', label: 'Shivering', icon: '🥶' },
  { id: 'sym5', label: 'Pant/Gasp', icon: '🥵' },
  { id: 'sym6', label: 'Unconscious', icon: '😵' },
  { id: 'sym7', label: 'Swelling', icon: '🤕' },
  { id: 'sym8', label: 'Eye Injury', icon: '👁️' },
];

export const FIRST_AID_TOPICS: FirstAidTopic[] = [
  { 
    id: 'fa1', 
    title: 'Stop Bleeding', 
    icon: '🩸',
    steps: ['Apply direct pressure with clean cloth', 'Elevate the limb if possible', 'Do not remove the cloth if soaked, add more on top', 'Keep animal calm'] 
  },
  { 
    id: 'fa2', 
    title: 'Heatstroke', 
    icon: '☀️',
    steps: ['Move to shade immediately', 'Pour cool (not ice) water over body', 'Offer small amounts of water', 'Use fan to cool down'] 
  },
  { 
    id: 'fa3', 
    title: 'Choking', 
    icon: '🦴',
    steps: ['Open mouth to check for object', 'Swipe finger to remove IF visible', 'Perform Heimlich maneuver if trained', 'Rush to vet immediately'] 
  },
  { 
    id: 'fa4', 
    title: 'Seizures', 
    icon: '⚡',
    steps: ['Do not hold the animal down', 'Remove objects that can cause injury', 'Time the seizure', 'Keep noise and light low'] 
  },
  { 
    id: 'fa5', 
    title: 'Poisoning', 
    icon: '☠️',
    steps: ['Identify the toxin if possible', 'Do NOT induce vomiting unless directed by vet', 'Collect sample of vomit/stool', 'Rush to vet immediately'] 
  },
];

export const MOCK_VET_AI_RESULT: VetAIResult = {
  condition: "Possible Leg Fracture",
  severity: "CRITICAL",
  confidence: 89,
  riskLevel: "HIGH",
  survivalWindow: "45 mins",
  immediateActions: [
    "Do not move animal unnecessarily",
    "Immobilize with cloth or board",
    "Transport urgently to nearest vet"
  ],
  volunteer: {
    steps: [
      "Approach slowly from the front",
      "Muzzle if showing aggression (use lace/cloth)",
      "Slide a flat board under the animal",
      "Apply gentle pressure to stop bleeding if any"
    ],
    donts: [
      "Do NOT pull the injured limb",
      "Do NOT offer water if animal is unconscious",
      "Do NOT try to reset the bone"
    ]
  },
  vet: {
    classification: "Open Compound Fracture (Tib/Fib)",
    diagnostics: "Radiographs (AP/Lateral), Bloodwork (PCV/TP)",
    protocol: "Analgesia (Opioids), IV Fluids, Surgical Fixation",
    dosage: "Meloxicam 0.2mg/kg, Tramadol 2-4mg/kg, Ceftriaxone 25mg/kg",
    triageCode: "RED - Immediate Surgical Intervention"
  }
};

export const INITIAL_USER_PROFILE: UserProfile = {
  name: 'Rishabh Gupta',
  role: 'Verified Volunteer',
  location: 'Mumbai',
  trustScore: 4.7,
  totalPaws: 2450,
  level: 'Stray Guardian',
  levelNum: 6,
  nextLevel: 'Rescue Champion',
  progress: 78,
  streak: 12,
  livesImpacted: 42
};

export const PAWS_HISTORY = [
  { id: 1, action: 'Reported Injured Dog', paws: 50, date: '2h ago', icon: '🚨' },
  { id: 2, action: 'Joined Rescue Op', paws: 120, date: '1d ago', icon: '🚑' },
  { id: 3, action: 'Vet AI Scan', paws: 20, date: '2d ago', icon: '🧠' },
  { id: 4, action: 'Case Closed: Bruno', paws: 200, date: '1w ago', icon: '✅' },
];

export const REWARDS = [
  { id: 1, title: '₹100 Pet Store Voucher', cost: 300, icon: '🏪' },
  { id: 2, title: 'Free Vet Checkup', cost: 800, icon: '🏥' },
  { id: 3, title: 'WoofCare Merchandise', cost: 600, icon: '👕' },
  { id: 4, title: 'Transport Coupon', cost: 200, icon: '🚕' },
];

export const BADGES = [
  { id: 1, name: 'First Report', icon: '📝', unlocked: true },
  { id: 2, name: 'Vet Ally', icon: '🩺', unlocked: true },
  { id: 3, name: 'Night Rescuer', icon: '🌙', unlocked: false },
  { id: 4, name: 'Community Star', icon: '⭐', unlocked: false },
];

export const MY_RESCUES = [
  { id: 1, name: 'Bruno', status: 'Recovered', date: '12 Oct', paws: 370, img: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=200&q=80' },
  { id: 2, name: 'Luna', status: 'Adopted', date: '05 Sep', paws: 520, img: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=200&q=80' },
];

export const CONDITION_TAGS = [
  { label: 'Injured', icon: '🩹' },
  { label: 'Sick', icon: '🤢' },
  { label: 'Starving', icon: '🦴' },
  { label: 'Aggressive', icon: '🦷' },
  { label: 'Pregnant', icon: '🤰' },
  { label: 'Lost', icon: '❓' },
  { label: 'Dead', icon: '⚰️' },
  { label: 'Other', icon: '📝' },
];
