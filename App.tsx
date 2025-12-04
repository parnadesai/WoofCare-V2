import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, MapPin, Heart, User, Syringe, Navigation, ShieldAlert, CheckCircle, AlertTriangle, 
  X, Image as ImageIcon, Share2, Sparkles, ChevronDown, MessageSquare, ThumbsUp, Map as MapIcon, 
  Phone, LayoutList, Stethoscope, Send, Bell, MoreVertical, Clock, ArrowBigUp, Search, 
  Filter, Siren, Gift, PawPrint, MessageCircle, Check, PlayCircle, Navigation2, ArrowRight, 
  Flame, Layers, Crosshair, ChevronRight, Eye, EyeOff, Mic, FileText, Thermometer, Activity, 
  Pill, AlertOctagon, Upload, ArrowLeft, ChevronUp, MessageCircleQuestion, Award, TrendingUp, 
  ShoppingBag, History, Edit3, Shield, Star, Settings, LogOut, Loader2 
} from 'lucide-react';
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { 
  View, Report, ChatMessage, VetAIResult, Story 
} from './types';
import { 
  URGENT_STORIES, FEED_ITEMS, NEARBY_RESOURCES, SYMPTOMS_LIST, FIRST_AID_TOPICS, 
  INITIAL_USER_PROFILE, PAWS_HISTORY, REWARDS, BADGES, MY_RESCUES, 
  CONDITION_TAGS 
} from './constants';
import Button from './components/Button';
import BottomNav from './components/BottomNav';
import ReportingProgressBar from './components/ReportingProgressBar';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper Functions ---

const getMarkerStyle = (status: string) => {
  switch(status) {
    case 'CRITICAL': return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse';
    case 'HELP': return 'bg-orange-500';
    case 'SAFE': return 'bg-emerald-500';
    case 'ADOPT': return 'bg-blue-500';
    default: return 'bg-stone-500';
  }
};

const getStatusColor = (status: string) => {
  switch(status) {
    case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-200';
    case 'HELP': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'SAFE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'ADOPT': return 'bg-blue-100 text-blue-700 border-blue-200';
    default: return 'bg-stone-100 text-stone-700';
  }
};

// Helper to clean JSON string from Markdown code blocks
const cleanJSON = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export default function WoofCareApp() {
  const [view, setView] = useState<View>(View.FEED);
  const [reports, setReports] = useState<Report[]>(FEED_ITEMS);
  const [profileTab, setProfileTab] = useState('OVERVIEW');
  const [userProfile, setUserProfile] = useState(INITIAL_USER_PROFILE);
  const [activityHistory, setActivityHistory] = useState(PAWS_HISTORY);
  
  // Map Module State
  const [selectedMapReport, setSelectedMapReport] = useState<Report | null>(null);
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
  // Vet AI Module State
  const [vetScanActive, setVetScanActive] = useState(false);
  const [vetScanResult, setVetScanResult] = useState<VetAIResult | null>(null);
  const [isVetMode, setIsVetMode] = useState(false); 
  const [vetScanImage, setVetScanImage] = useState<string | null>(null);
  const [vetViewMode, setVetViewMode] = useState('HOME');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [expandedFirstAid, setExpandedFirstAid] = useState<string | null>(null);
  const [firstAidSearch, setFirstAidSearch] = useState("");

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: 'bot', text: "Hello! I'm your AI Vet Assistant. I can help you stabilize critical situations. What's happening?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<Chat | null>(null);

  // Reporting Wizard State
  const [reportData, setReportData] = useState({
    image: null as string | null,
    location: 'Kandivali West, Mumbai',
    landmark: '',
    tags: [] as string[],
    urgency: 'Normal',
    desc: '',
    reporterName: userProfile.name,
    reporterPhone: '+91 98xxx xxxxx',
    allowCall: true
  });
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const vetCameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (view === View.MAPS) {
      setIsLocating(true);
      setTimeout(() => setIsLocating(false), 1500);
    }
  }, [view]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, vetViewMode, chatLoading]);

  // --- AI Logic ---

  const initChat = () => {
    if (!chatSessionRef.current) {
      chatSessionRef.current = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: "You are an expert veterinarian AI assistant named WoofCare AI. Help users with animal first aid, triage, and general health advice. Be concise, urgent if the situation demands it, and compassionate. Always advise seeing a real vet for serious issues.",
        },
      });
    }
    return chatSessionRef.current;
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userText = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatLoading(true);

    try {
      const chat = initChat();
      const result = await chat.sendMessage({ message: userText });
      setChatMessages(prev => [...prev, { sender: 'bot', text: result.text }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, { sender: 'bot', text: "I'm having trouble connecting. Please check your internet or try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const analyzeVetImageAI = async (base64Image: string) => {
    setVetScanActive(true);
    setVetScanResult(null);

    try {
      // NOTE: gemini-2.5-flash-image does NOT support responseSchema. We must parse JSON manually.
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } },
            { text: `Analyze this animal image. Identify the animal, condition, and severity. 
              Return a JSON object (NO MARKDOWN) with this structure:
              {
                "condition": "string (e.g., Possible Leg Fracture)",
                "severity": "CRITICAL" | "High" | "Normal" | "Low",
                "confidence": number (0-100),
                "riskLevel": "string",
                "survivalWindow": "string (e.g., 45 mins)",
                "immediateActions": ["action1", "action2"],
                "volunteer": { "steps": ["step1"], "donts": ["dont1"] },
                "vet": { "classification": "string", "diagnostics": "string", "protocol": "string", "dosage": "string", "triageCode": "string" }
              }`
            }
          ]
        }
      });

      const json = JSON.parse(cleanJSON(response.text));
      setVetScanResult(json);
    } catch (error) {
      console.error("Vet AI Scan Error:", error);
      alert("Could not analyze image. Please try again.");
    } finally {
      setVetScanActive(false);
    }
  };

  const analyzeSymptomsAI = async () => {
    if (selectedSymptoms.length === 0) return;
    setVetScanActive(true);
    setVetViewMode('HOME'); // Switch to home to show loading/result overlay
    setVetScanResult(null);

    try {
      // For text-only analysis, we CAN use responseSchema with gemini-2.5-flash
      const symptomsText = selectedSymptoms.map(id => SYMPTOMS_LIST.find(s => s.id === id)?.label).join(', ');
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `An animal has these symptoms: ${symptomsText}. Provide a diagnosis and triage plan.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              condition: { type: Type.STRING },
              severity: { type: Type.STRING, enum: ["CRITICAL", "High", "Normal", "Low"] },
              confidence: { type: Type.NUMBER },
              riskLevel: { type: Type.STRING },
              survivalWindow: { type: Type.STRING },
              immediateActions: { type: Type.ARRAY, items: { type: Type.STRING } },
              volunteer: {
                type: Type.OBJECT,
                properties: {
                  steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                  donts: { type: Type.ARRAY, items: { type: Type.STRING } },
                }
              },
              vet: {
                type: Type.OBJECT,
                properties: {
                  classification: { type: Type.STRING },
                  diagnostics: { type: Type.STRING },
                  protocol: { type: Type.STRING },
                  dosage: { type: Type.STRING },
                  triageCode: { type: Type.STRING },
                }
              }
            }
          }
        }
      });

      const json = JSON.parse(response.text);
      setVetScanResult(json);
    } catch (error) {
      console.error("Symptom Analysis Error:", error);
      alert("Analysis failed.");
    } finally {
      setVetScanActive(false);
    }
  };

  const autoFillReportAI = async (base64Image: string) => {
    setIsAutoFilling(true);
    try {
      // Auto-fill report details based on image using gemini-2.5-flash-image
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } },
            { text: `Analyze this image for an animal rescue report. 
              Return a JSON object (NO MARKDOWN) with:
              - tags: array of strings (e.g., Injured, Sick, Dog, Cat) from this list if applicable: [Injured, Sick, Starving, Aggressive, Pregnant, Lost, Dead].
              - urgency: "Critical" | "Serious" | "Mild".
              - desc: A short 1-2 sentence description of the visible situation.` 
            }
          ]
        }
      });
      
      const json = JSON.parse(cleanJSON(response.text));
      
      setReportData(prev => ({
        ...prev,
        tags: json.tags || [],
        urgency: json.urgency || 'Normal',
        desc: json.desc || ''
      }));

    } catch (e) {
      console.error("Auto-fill failed", e);
    } finally {
      setIsAutoFilling(false);
    }
  };

  // --- Handlers ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setReportData(prev => ({ ...prev, image: result }));
        setView(View.REPORT_LOCATION);
        // Trigger smart AI analysis in background
        autoFillReportAI(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVetScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setVetScanImage(result);
        analyzeVetImageAI(result); // Trigger real analysis
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleTag = (tag: string) => {
    setReportData(prev => {
      const newTags = prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag];
      return { ...prev, tags: newTags };
    });
  };

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptomId) ? prev.filter(id => id !== symptomId) : [...prev, symptomId]
    );
  };

  const submitFinalReport = () => {
    const newReport: Report = {
      id: `r-${Date.now()}`,
      reporter: reportData.reporterName,
      verified: true,
      location: reportData.location,
      distance: '0 km',
      time: 'Just Now',
      type: reportData.tags.find(t => ['Dog', 'Cat', 'Cow'].includes(t)) || 'Stray',
      status: (reportData.urgency === 'Critical' || reportData.urgency === 'Serious') ? 'CRITICAL' : 'HELP',
      progressStep: 0,
      volunteers: 0,
      desc: reportData.desc || `Reported as ${reportData.tags.join(', ')}`,
      image: reportData.image,
      coords: '19.2183,72.9781',
      phone: reportData.allowCall ? '1234567890' : null,
      votes: 0,
      isNew: true,
      mapPos: { top: '50%', left: '50%' }
    };
    setReports([newReport, ...reports]);
    
    // Log Activity
    const newActivity = {
      id: Date.now(),
      action: `Reported ${newReport.type}`,
      paws: 50,
      date: 'Just Now',
      icon: '🚨'
    };
    setActivityHistory(prev => [newActivity, ...prev]);

    // Award Paws
    setUserProfile(prev => ({
      ...prev,
      totalPaws: prev.totalPaws + 50,
      streak: prev.streak + 1
    }));

    setView(View.RESCUE_STATUS);
  };

  const startNavigation = (report: Report) => {
    setSelectedMapReport(report);
    setView(View.NAVIGATION);
  };

  const handleArrival = () => {
    // Log Activity for arriving at scene
    const newActivity = {
      id: Date.now(),
      action: 'Joined Rescue Op',
      paws: 120,
      date: 'Just Now',
      icon: '🚑'
    };
    setActivityHistory(prev => [newActivity, ...prev]);

    // Award Paws
    setUserProfile(prev => ({
      ...prev,
      totalPaws: prev.totalPaws + 120
    }));

    setView(View.FEED);
  };

  const openGoogleMaps = (coords: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${coords}`, '_blank');
  };

  const callReporter = (phone: string) => {
    if(phone) window.open(`tel:${phone}`, '_self');
  };

  // --- Sub-Render Functions ---

  const renderFeed = () => (
    <div className="h-full flex flex-col bg-stone-50 relative pb-24">
      <div className="bg-white pt-12 pb-2 px-4 flex justify-between items-center sticky top-0 z-20 shadow-sm/50 backdrop-blur-md bg-white/90">
        <div className="flex items-center gap-2">
           <div className="bg-orange-100 p-2 rounded-xl">
              <PawPrint size={20} className="text-orange-600" fill="currentColor" />
           </div>
           <div>
              <h1 className="text-xl font-black text-stone-800 leading-none tracking-tight">WoofCare</h1>
              <div className="flex items-center gap-1 mt-0.5">
                 <MapPin size={10} className="text-stone-400" />
                 <p className="text-[10px] font-bold text-stone-500">Kandivali, Mumbai</p>
              </div>
           </div>
        </div>
        <div className="flex gap-3">
           <button className="bg-stone-100 p-2 rounded-full text-stone-600"><Search size={20} /></button>
           <button className="bg-stone-100 p-2 rounded-full text-stone-600"><Bell size={20} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {URGENT_STORIES.length > 0 && (
          <div className="pt-4 pb-4 border-b border-stone-100">
             <div className="px-4 flex items-center justify-between mb-3">
                <h2 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2 animate-pulse">
                   <Siren size={14} /> Urgent Rescues
                </h2>
                <span className="text-[10px] font-bold text-stone-400">See All</span>
             </div>
             <div className="flex gap-4 overflow-x-auto px-4 pb-2 no-scrollbar snap-x">
                {URGENT_STORIES.map(story => (
                   <div key={story.id} className="flex-shrink-0 flex flex-col items-center gap-2 snap-start cursor-pointer group w-20">
                      <div className="w-18 h-18 rounded-full p-[3px] bg-gradient-to-tr from-red-600 via-red-500 to-orange-500 relative shadow-lg shadow-red-200">
                         <div className="w-16 h-16 rounded-full border-[3px] border-white overflow-hidden relative bg-stone-200">
                            <img src={story.img} className="w-full h-full object-cover" alt="" />
                            <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                               <PlayCircle size={20} className="text-white drop-shadow-md" />
                            </div>
                         </div>
                         <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-full border-2 border-white whitespace-nowrap shadow-sm">
                            {story.tag}
                         </div>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-stone-800 leading-tight truncate w-full">{story.title}</p>
                        <p className="text-[9px] text-stone-400">{story.time}</p>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        )}

        <div className="px-4 space-y-6 pb-8 pt-4">
           {reports.length === 0 && (
              <div className="text-center py-10 opacity-50 flex flex-col items-center mt-4">
                 <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <PawPrint size={40} className="text-stone-300" />
                 </div>
                 <p className="text-sm font-bold text-stone-500">No active rescues nearby</p>
                 <p className="text-xs text-stone-400 mt-1">Good news! The streets are safe for now.</p>
              </div>
           )}
           {reports.map(report => (
              <div key={report.id} className={`bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden border border-stone-100 ${report.isNew ? 'animate-in slide-in-from-top-10 duration-700' : ''}`}>
                 <div className="p-4 flex justify-between items-start">
                    <div className="flex gap-3">
                       <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold text-sm">
                          {report.reporter.charAt(0)}
                       </div>
                       <div>
                          <div className="flex items-center gap-1">
                             <p className="text-sm font-bold text-stone-800">{report.reporter}</p>
                             {report.verified && <CheckCircle size={12} className="text-blue-500" fill="currentColor" />}
                          </div>
                          <p className="text-[10px] font-medium text-stone-400">{report.distance} away • {report.time}</p>
                       </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${getStatusColor(report.status)}`}>
                       {report.status}
                    </span>
                 </div>

                 <div className="w-full aspect-[4/3] bg-stone-200 relative">
                    <img src={report.image || ''} className="w-full h-full object-cover" alt="Rescue" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-4">
                       <p className="text-white font-medium text-sm line-clamp-2 drop-shadow-md">
                          {report.desc}
                       </p>
                    </div>
                 </div>

                 <div className="p-4">
                    <div className="space-y-3 mb-4">
                        <div className="grid grid-cols-4 gap-2">
                            <button 
                                onClick={() => startNavigation(report)}
                                className="col-span-2 bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-200 active:scale-95 transition-transform"
                            >
                                <Siren size={18} className="animate-pulse" /> I'm On My Way
                            </button>
                            <button 
                                onClick={() => openGoogleMaps(report.coords)}
                                className="bg-stone-100 text-stone-700 py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 border border-stone-200 active:bg-stone-200"
                            >
                                <Navigation size={16} /> <span>Nav</span>
                            </button>
                            {report.phone && (
                                <button 
                                    onClick={() => callReporter(report.phone!)}
                                    className="bg-stone-100 text-stone-700 py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 border border-stone-200 active:bg-stone-200"
                                >
                                    <Phone size={16} /> <span>Call</span>
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button className="flex-1 border border-pink-200 bg-pink-50 text-pink-700 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-pink-100 active:scale-95 transition-transform">
                                <Heart size={16} className="text-pink-600" fill="currentColor" /> Pledge Help
                            </button>
                            <button className="flex-1 border border-stone-200 text-stone-600 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-stone-50 active:scale-95 transition-transform">
                                <PawPrint size={16} /> Adopt/Foster
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-stone-50 rounded-2xl p-3 border border-stone-100 mb-4">
                       <div className="flex justify-between text-[10px] font-bold text-stone-400 mb-2 uppercase tracking-wider">
                          <span className={report.progressStep >= 0 ? 'text-orange-600' : ''}>Reported</span>
                          <span className={report.progressStep >= 1 ? 'text-orange-600' : ''}>On Way</span>
                          <span className={report.progressStep >= 2 ? 'text-orange-600' : ''}>At Vet</span>
                          <span className={report.progressStep >= 3 ? 'text-green-600' : ''}>Safe</span>
                       </div>
                       <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-1000 ${report.status === 'SAFE' ? 'bg-green-500' : 'bg-orange-500'}`} style={{width: `${(report.progressStep / 3) * 100}%`}}></div>
                       </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-stone-100">
                        <div className="flex gap-6">
                            <button className="text-stone-500 hover:text-orange-500 transition-colors flex items-center gap-1.5">
                                <ArrowBigUp size={22} />
                                <span className="text-xs font-bold">{report.votes} Boost</span>
                            </button>
                            <button className="text-stone-500 hover:text-blue-500 transition-colors flex items-center gap-1.5">
                               <MessageCircle size={20} />
                               <span className="text-xs font-bold">Comment</span>
                            </button>
                        </div>
                        <button className="text-stone-400 hover:text-green-600 transition-colors flex items-center gap-1.5">
                           <Share2 size={20} />
                           <span className="text-xs font-bold">Share</span>
                        </button>
                    </div>
                 </div>
              </div>
           ))}
        </div>
      </div>
    </div>
  );

  const renderMaps = () => (
    <div className="h-full flex flex-col bg-stone-100 relative pb-20">
      <div className="absolute inset-0 bg-stone-200 overflow-hidden" onClick={() => setSelectedMapReport(null)}>
          <div className={`absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/72.8526,19.2047,14,0/600x600?access_token=Pk.mock')] bg-cover transition-opacity duration-500 ${heatmapMode ? 'opacity-30' : 'opacity-100'}`}></div>
          {heatmapMode && <div className="absolute inset-0 bg-gradient-to-tr from-red-500/40 via-yellow-500/30 to-green-500/20 blur-3xl pointer-events-none animate-in fade-in duration-700"></div>}
          {reports.map(r => (
             r.mapPos && (
               <div key={r.id} className={`absolute transition-all duration-300 hover:scale-110 cursor-pointer ${selectedMapReport?.id === r.id ? 'scale-125 z-20' : 'z-10'}`} style={r.mapPos} onClick={(e) => { e.stopPropagation(); setSelectedMapReport(r); }}>
                  <div className={`p-2.5 rounded-full shadow-lg border-2 border-white flex items-center justify-center w-10 h-10 ${getMarkerStyle(r.status)}`}>
                     {r.type === 'Dog' ? <PawPrint size={18} className="text-white" fill="currentColor" /> : <AlertTriangle size={18} className="text-white" />}
                  </div>
                  {selectedMapReport?.id === r.id && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-white"></div>}
               </div>
             )
          ))}
          {NEARBY_RESOURCES.map(res => (
             res.mapPos && (
                <div key={res.id} className="absolute z-0" style={res.mapPos}>
                   <div className="p-1.5 bg-white rounded-full border-2 border-blue-500 shadow-sm w-8 h-8 flex items-center justify-center">
                      <Stethoscope size={14} className="text-blue-500" />
                   </div>
                </div>
             )
          ))}
      </div>

      <div className="absolute top-12 left-4 right-4 z-30 flex flex-col gap-3">
         <div className="bg-white p-3 rounded-2xl shadow-xl flex items-center gap-3 border border-stone-100">
            <Search size={20} className="text-stone-400" />
            <input type="text" placeholder="Search area or NGO..." className="flex-1 text-sm outline-none text-stone-700 font-medium" />
            <div className="w-px h-6 bg-stone-200"></div>
            <div className="flex items-center gap-1 text-stone-500">
               <Crosshair size={16} />
               <span className="text-xs font-bold">Kandivali</span>
            </div>
         </div>
         <div className="flex justify-end gap-2">
            <button onClick={() => setHeatmapMode(!heatmapMode)} className={`p-3 rounded-full shadow-lg border transition-colors ${heatmapMode ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-stone-600 border-white'}`}>
               <Flame size={20} />
            </button>
            <button className="p-3 bg-white text-stone-600 rounded-full shadow-lg border border-white"><Layers size={20} /></button>
         </div>
      </div>

      {selectedMapReport && (
         <div className="absolute bottom-24 left-4 right-4 bg-white p-5 rounded-[2rem] shadow-2xl z-30 animate-in slide-in-from-bottom-10 border border-stone-100">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-stone-800 text-white px-4 py-1 rounded-full text-[10px] font-bold shadow-lg flex items-center gap-1">
               <Sparkles size={10} className="text-orange-400" /> AI Suggestion: Nearest Vet 0.5km away
            </div>
            <div className="flex gap-4 mb-4">
               <div className="w-20 h-20 bg-stone-200 rounded-2xl overflow-hidden shadow-inner shrink-0">
                  <img src={selectedMapReport.image || ''} className="w-full h-full object-cover" alt="" />
               </div>
               <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                     <h3 className="font-bold text-lg text-stone-900 leading-tight truncate">{selectedMapReport.type} Rescue</h3>
                     <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${selectedMapReport.status === 'CRITICAL' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                        {selectedMapReport.status}
                     </span>
                  </div>
                  <p className="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">{selectedMapReport.desc}</p>
                  <div className="flex gap-3 mt-2 text-[10px] font-bold text-stone-400">
                     <span className="flex items-center gap-1"><Clock size={10} /> {selectedMapReport.time}</span>
                     <span className="flex items-center gap-1"><MapPin size={10} /> {selectedMapReport.distance}</span>
                  </div>
               </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
               <button onClick={() => startNavigation(selectedMapReport)} className="col-span-2 bg-stone-900 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95">
                  <Navigation size={16} /> Navigate
               </button>
               <button className="bg-orange-50 text-orange-700 py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 active:scale-95 border border-orange-100"><Phone size={16} /> Call</button>
               <button className="bg-blue-50 text-blue-700 py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 active:scale-95 border border-blue-100"><Gift size={16} /> Pledge</button>
            </div>
         </div>
      )}
    </div>
  );

  const renderNavigation = () => (
    <div className="h-full bg-stone-900 relative flex flex-col">
       <div className="flex-1 relative opacity-80">
          <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/72.8526,19.2047,15,0/600x800?access_token=Pk.mock')] bg-cover"></div>
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
             <path d="M 180 400 Q 200 300 250 200" stroke="#3b82f6" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray="10 5" className="animate-pulse" />
             <circle cx="180" cy="400" r="8" fill="#3b82f6" className="animate-ping" />
          </svg>
       </div>
       <div className="absolute top-12 left-4 right-4 bg-stone-800 p-4 rounded-2xl shadow-xl border border-stone-700 flex gap-4 items-center">
          <div className="bg-stone-700 p-3 rounded-xl"><ArrowRight size={32} className="text-white" /></div>
          <div className="text-white">
             <p className="text-2xl font-bold">200 m</p>
             <p className="text-sm text-stone-400">Turn right onto MG Road</p>
          </div>
       </div>
       <div className="bg-stone-800 p-6 rounded-t-[2rem] border-t border-stone-700 pb-10">
          <div className="flex justify-between items-center mb-6">
             <div className="text-white"><p className="text-xs text-stone-400">Time Remaining</p><p className="text-xl font-bold text-green-400">4 min</p></div>
             <div className="text-right text-white"><p className="text-xs text-stone-400">Destination</p><p className="text-xl font-bold">Help {selectedMapReport?.type}</p></div>
          </div>
          <Button onClick={handleArrival} variant="primary" className="bg-green-600 hover:bg-green-700 shadow-green-900/50"><CheckCircle size={20} /> I Have Arrived</Button>
          <button onClick={() => setView(View.MAPS)} className="w-full text-center text-stone-500 text-xs mt-4 font-bold uppercase tracking-widest">Cancel Navigation</button>
       </div>
    </div>
  );

  const renderVetAI = () => (
    <div className="h-full bg-stone-50 flex flex-col relative pb-24">
      <div className="bg-white p-4 pt-12 shadow-sm z-10 flex justify-between items-center sticky top-0">
         <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-2 rounded-xl"><Stethoscope size={24} className="text-emerald-600" /></div>
            <div>
               <h1 className="text-xl font-black text-stone-800">Vet AI</h1>
               <p className="text-xs text-stone-500">Smart Diagnostic Assistant</p>
            </div>
         </div>
         <button 
            onClick={() => setIsVetMode(!isVetMode)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 border ${
               isVetMode ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'
            }`}
         >
            {isVetMode ? <FileText size={14} /> : <Heart size={14} />}
            {isVetMode ? 'Vet Mode' : 'Volunteer Mode'}
         </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
         {vetViewMode === 'HOME' && !vetScanResult && !vetScanActive && (
            <div className="h-full flex flex-col justify-center items-center space-y-6">
               <div className="text-center space-y-2">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-50">
                     <Activity size={40} className="text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-stone-800">Health Scanner</h2>
                  <p className="text-stone-500 text-sm max-w-xs mx-auto">Upload a photo or video to analyze symptoms, detect injuries, and get instant care protocols.</p>
               </div>

               <div className="w-full max-w-xs space-y-3">
                  <div className="relative">
                     <input ref={vetCameraRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleVetScan} />
                     <Button onClick={() => vetCameraRef.current?.click()} className="w-full shadow-xl shadow-emerald-200 bg-emerald-600 hover:bg-emerald-700 py-4">
                        <Camera size={20} /> Scan Animal
                     </Button>
                  </div>
                  <Button variant="secondary" className="w-full py-4" onClick={() => vetCameraRef.current?.click()}>
                     <Upload size={20} /> Upload Media
                  </Button>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                     <button 
                        onClick={() => setVetViewMode('SYMPTOMS')}
                        className="p-4 bg-white rounded-2xl border border-stone-100 shadow-sm flex flex-col items-center gap-2 text-stone-600 hover:bg-stone-50 transition-colors"
                     >
                        <Thermometer size={24} className="text-orange-500" />
                        <span className="text-xs font-bold">Symptoms</span>
                     </button>
                     <button 
                        onClick={() => setVetViewMode('FIRST_AID')}
                        className="p-4 bg-white rounded-2xl border border-stone-100 shadow-sm flex flex-col items-center gap-2 text-stone-600 hover:bg-stone-50 transition-colors"
                     >
                        <Pill size={24} className="text-blue-500" />
                        <span className="text-xs font-bold">First Aid</span>
                     </button>
                  </div>
                  <button 
                     onClick={() => setVetViewMode('CHAT')}
                     className="w-full p-4 bg-white rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-center gap-2 text-emerald-700 font-bold hover:bg-emerald-50 transition-colors mt-2"
                  >
                     <MessageCircleQuestion size={20} /> Ask Vet AI
                  </button>
               </div>
            </div>
         )}

         {vetViewMode === 'SYMPTOMS' && !vetScanActive && (
            <div className="space-y-6">
               <button onClick={() => setVetViewMode('HOME')} className="flex items-center gap-2 text-stone-500 font-bold text-sm mb-2">
                  <ArrowLeft size={16} /> Back
               </button>
               <h2 className="text-xl font-bold text-stone-800">What symptoms do you see?</h2>
               <div className="grid grid-cols-2 gap-3">
                  {SYMPTOMS_LIST.map(sym => (
                     <button
                        key={sym.id}
                        onClick={() => toggleSymptom(sym.id)}
                        className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                           selectedSymptoms.includes(sym.id)
                           ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm'
                           : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                     >
                        <span className="text-2xl">{sym.icon}</span>
                        <span className="text-xs font-bold">{sym.label}</span>
                     </button>
                  ))}
               </div>
               <Button 
                  onClick={analyzeSymptomsAI} 
                  className={`w-full mt-4 ${selectedSymptoms.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}
               >
                  Analyze Symptoms ({selectedSymptoms.length})
               </Button>
            </div>
         )}

         {vetViewMode === 'FIRST_AID' && (
            <div className="space-y-4">
               <button onClick={() => setVetViewMode('HOME')} className="flex items-center gap-2 text-stone-500 font-bold text-sm mb-2">
                  <ArrowLeft size={16} /> Back
               </button>
               <h2 className="text-xl font-bold text-stone-800 mb-2">Emergency Guide</h2>
               
               <div className="relative mb-4">
                  <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input 
                     type="text" 
                     placeholder="Search 'Bleeding', 'Choking'..." 
                     value={firstAidSearch}
                     onChange={(e) => setFirstAidSearch(e.target.value)}
                     className="w-full pl-10 p-3 bg-white rounded-xl border border-stone-200 text-sm outline-none focus:border-emerald-500"
                  />
               </div>

               {FIRST_AID_TOPICS.filter(t => t.title.toLowerCase().includes(firstAidSearch.toLowerCase())).map(topic => (
                  <div key={topic.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden transition-all shadow-sm">
                     <button 
                        onClick={() => setExpandedFirstAid(expandedFirstAid === topic.id ? null : topic.id)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-50"
                     >
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-xl">
                              {topic.icon}
                           </div>
                           <span className="font-bold text-stone-800">{topic.title}</span>
                        </div>
                        {expandedFirstAid === topic.id ? <ChevronUp size={20} className="text-stone-400" /> : <ChevronDown size={20} className="text-stone-400" />}
                     </button>
                     {expandedFirstAid === topic.id && (
                        <div className="p-4 pt-0 bg-stone-50 border-t border-stone-100">
                           <ul className="space-y-3 mt-3">
                              {topic.steps.map((step, idx) => (
                                 <li key={idx} className="flex gap-3 text-sm text-stone-600">
                                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                                       {idx + 1}
                                    </div>
                                    {step}
                                 </li>
                              ))}
                           </ul>
                        </div>
                     )}
                  </div>
               ))}
            </div>
         )}

         {vetViewMode === 'CHAT' && (
            <div className="h-full flex flex-col">
               <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setVetViewMode('HOME')} className="flex items-center gap-2 text-stone-500 font-bold text-sm">
                     <ArrowLeft size={16} /> Back
                  </button>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">AI Online</span>
               </div>
               
               <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                  {chatMessages.map((msg, idx) => (
                     <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                           msg.sender === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white border border-stone-100 text-stone-700 rounded-bl-none'
                        }`}>
                           {msg.text}
                        </div>
                     </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-stone-100 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                         <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce"></div>
                         <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                         <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef}></div>
               </div>

               <div className="flex gap-2">
                  <input 
                     type="text" 
                     value={chatInput}
                     onChange={(e) => setChatInput(e.target.value)}
                     placeholder="Describe symptoms..." 
                     className="flex-1 bg-white border border-stone-200 rounded-full px-5 py-3.5 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                     onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button onClick={handleSendMessage} className="bg-emerald-600 text-white p-3.5 rounded-full hover:bg-emerald-700 active:scale-95 shadow-lg shadow-emerald-100">
                     <Send size={20} />
                  </button>
               </div>
            </div>
         )}

         {vetScanActive && (
            <div className="h-full flex flex-col items-center justify-center text-center">
               <div className="relative w-32 h-32 mb-8">
                  <div className="absolute inset-0 border-4 border-emerald-200 rounded-full animate-ping"></div>
                  <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                     <Sparkles size={40} className="text-emerald-600" />
                  </div>
               </div>
               <h2 className="text-xl font-bold text-stone-800">Analyzing...</h2>
               <p className="text-stone-500 text-sm mt-2">Diagnosing symptoms with Gemini AI</p>
            </div>
         )}

         {vetScanResult && (
            <div className="space-y-4 animate-in slide-in-from-bottom-10 fade-in duration-500">
               <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-stone-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-red-500 text-white px-4 py-1.5 rounded-bl-2xl text-[10px] font-black tracking-widest uppercase">
                     {vetScanResult.severity}
                  </div>
                  <div className="flex gap-4 items-start">
                     <div className="w-20 h-20 bg-stone-200 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center">
                        {vetScanImage ? <img src={vetScanImage} className="w-full h-full object-cover" alt="Scan" /> : <Activity size={32} className="text-stone-400" />}
                     </div>
                     <div>
                        <h2 className="text-lg font-black text-stone-800 leading-tight">{vetScanResult.condition}</h2>
                        <div className="flex items-center gap-2 mt-2">
                           <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-emerald-100">
                              {vetScanResult.confidence}% Confidence
                           </span>
                           <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                              AI Assessment
                           </span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="mt-4 flex gap-3 p-3 bg-red-50 rounded-xl border border-red-100 items-start">
                     <AlertOctagon size={20} className="text-red-600 shrink-0 mt-0.5" />
                     <div>
                        <p className="text-xs font-bold text-red-800">Risk Level: {vetScanResult.riskLevel}</p>
                        <p className="text-[10px] text-red-600 mt-0.5">Est. Survival Window: <span className="font-bold">{vetScanResult.survivalWindow}</span></p>
                     </div>
                  </div>
               </div>

               <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-stone-100">
                  <h3 className="text-sm font-black text-stone-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                     <ShieldAlert size={16} className="text-orange-500" /> Immediate Actions
                  </h3>
                  <ul className="space-y-2">
                     {vetScanResult.immediateActions.map((action, i) => (
                        <li key={i} className="flex gap-3 items-center text-sm font-medium text-stone-700">
                           <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs shrink-0">{i+1}</div>
                           {action}
                        </li>
                     ))}
                  </ul>
               </div>

               {isVetMode ? (
                  <div className="bg-blue-50 p-5 rounded-[2rem] border border-blue-100">
                     <h3 className="text-sm font-black text-blue-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <FileText size={16} /> Clinical Assessment
                     </h3>
                     <div className="space-y-4">
                        <div>
                           <p className="text-[10px] font-bold text-blue-400 uppercase">Classification</p>
                           <p className="text-sm font-bold text-blue-900">{vetScanResult.vet.classification}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-bold text-blue-400 uppercase">Recommended Diagnostics</p>
                           <p className="text-sm text-blue-800">{vetScanResult.vet.diagnostics}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-bold text-blue-400 uppercase">Treatment Protocol</p>
                           <p className="text-sm text-blue-800">{vetScanResult.vet.protocol}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-blue-200">
                           <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">Dosage Template</p>
                           <p className="text-xs font-mono text-stone-700">{vetScanResult.vet.dosage}</p>
                        </div>
                     </div>
                  </div>
               ) : (
                  <div className="space-y-4">
                     <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-stone-100">
                        <h3 className="text-sm font-black text-stone-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                           <CheckCircle size={16} className="text-emerald-500" /> First Aid Guide
                        </h3>
                        <div className="space-y-3">
                           {vetScanResult.volunteer.steps.map((step, i) => (
                              <div key={i} className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl">
                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                 <p className="text-sm text-stone-700">{step}</p>
                              </div>
                           ))}
                        </div>
                     </div>

                     <div className="bg-red-50 p-5 rounded-[2rem] border border-red-100">
                        <h3 className="text-sm font-black text-red-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                           <X size={16} /> What NOT To Do
                        </h3>
                        <ul className="space-y-2">
                           {vetScanResult.volunteer.donts.map((item, i) => (
                              <li key={i} className="text-xs font-bold text-red-700 flex items-center gap-2">
                                 <span>•</span> {item}
                              </li>
                           ))}
                        </ul>
                     </div>
                  </div>
               )}

               <Button variant="secondary" onClick={() => { setVetScanResult(null); setVetViewMode('HOME'); }} className="w-full mt-4">
                  Start New Scan
               </Button>
            </div>
         )}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="h-full bg-stone-50 flex flex-col relative pb-24">
      <div className="bg-white p-6 pt-12 shadow-sm border-b border-stone-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-red-500 p-[3px] shadow-lg">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center border-2 border-white overflow-hidden">
                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80" alt="Profile" className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black text-stone-800 leading-tight">{userProfile.name}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <Shield size={14} className="text-blue-500 fill-blue-500" />
                <p className="text-xs font-bold text-stone-500">{userProfile.role}</p>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={12} className="text-stone-400" />
                <p className="text-[10px] font-medium text-stone-400">{userProfile.location}</p>
              </div>
            </div>
          </div>
          <button className="p-2 bg-stone-100 rounded-full text-stone-500 hover:bg-stone-200"><Settings size={20} /></button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 flex flex-col items-center">
            <div className="flex items-center gap-1 mb-1">
              <Star size={14} className="text-yellow-500 fill-yellow-500" />
              <span className="text-xs font-bold text-stone-500">Trust</span>
            </div>
            <span className="text-xl font-black text-stone-800">{userProfile.trustScore}</span>
          </div>
          <div className="bg-orange-50 p-3 rounded-2xl border border-orange-100 flex flex-col items-center">
            <div className="flex items-center gap-1 mb-1">
              <PawPrint size={14} className="text-orange-600" fill="currentColor" />
              <span className="text-xs font-bold text-orange-600">Paws</span>
            </div>
            <span className="text-xl font-black text-orange-600">{userProfile.totalPaws}</span>
          </div>
          <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 flex flex-col items-center">
            <div className="flex items-center gap-1 mb-1">
              <Award size={14} className="text-blue-500" />
              <span className="text-xs font-bold text-stone-500">Level {userProfile.levelNum}</span>
            </div>
            <span className="text-[10px] font-black text-stone-800 uppercase tracking-tight text-center leading-tight">{userProfile.level}</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[10px] font-bold text-stone-400 mb-1.5">
            <span>Next: {userProfile.nextLevel}</span>
            <span>{userProfile.progress}%</span>
          </div>
          <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full" style={{ width: `${userProfile.progress}%` }}></div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-around border-b border-stone-100 bg-white sticky top-[280px] z-10 overflow-x-auto no-scrollbar">
        {['OVERVIEW', 'ACTIVITY', 'WALLET', 'BADGES'].map((tab) => (
          <button
            key={tab}
            onClick={() => setProfileTab(tab)}
            className={`px-4 py-4 text-xs font-bold transition-all border-b-2 ${
              profileTab === tab 
                ? 'text-orange-600 border-orange-600' 
                : 'text-stone-400 border-transparent hover:text-stone-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        
        {profileTab === 'OVERVIEW' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl text-white shadow-lg shadow-emerald-100">
                <Heart size={24} className="mb-2 opacity-80" />
                <p className="text-3xl font-black">{userProfile.livesImpacted}</p>
                <p className="text-xs font-medium opacity-80">Lives Impacted</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-blue-100">
                <Flame size={24} className="mb-2 opacity-80" />
                <p className="text-3xl font-black">{userProfile.streak}</p>
                <p className="text-xs font-medium opacity-80">Day Streak</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-stone-800 uppercase tracking-wide">My Rescues</h3>
                <span className="text-xs font-bold text-orange-600">View All</span>
              </div>
              <div className="space-y-3">
                {MY_RESCUES.map(rescue => (
                  <div key={rescue.id} className="bg-white p-3 rounded-2xl border border-stone-100 shadow-sm flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-200 shrink-0">
                      <img src={rescue.img} className="w-full h-full object-cover" alt={rescue.name} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-stone-800">{rescue.name}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${rescue.status === 'Recovered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {rescue.status}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 mt-1">Rescued on {rescue.date}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <PawPrint size={12} className="text-orange-500" />
                        <span className="text-xs font-bold text-orange-600">+{rescue.paws} Paws Earned</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {profileTab === 'WALLET' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-stone-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Total Balance</p>
                <h2 className="text-4xl font-black flex items-center gap-2">
                  {userProfile.totalPaws} <span className="text-2xl text-orange-500">🐾</span>
                </h2>
                <div className="mt-6 flex gap-3">
                  <button className="flex-1 bg-white text-stone-900 py-2.5 rounded-xl text-xs font-bold hover:bg-stone-100">History</button>
                  <button className="flex-1 bg-orange-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-orange-700">Redeem</button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-stone-800 uppercase tracking-wide mb-4">Redeem Rewards</h3>
              <div className="grid grid-cols-2 gap-3">
                {REWARDS.map(reward => (
                  <div key={reward.id} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex flex-col gap-3 hover:border-orange-200 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 bg-stone-50 rounded-full flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                      {reward.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-stone-800 leading-tight mb-1">{reward.title}</h4>
                      <p className="text-xs font-bold text-orange-600">{reward.cost} Paws</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {profileTab === 'ACTIVITY' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-stone-800 uppercase tracking-wide">Recent Actions</h3>
              <Filter size={16} className="text-stone-400" />
            </div>
            <div className="relative pl-4 border-l-2 border-stone-100 space-y-6">
              {activityHistory.map((item) => (
                <div key={item.id} className="relative">
                  <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-sm"></div>
                  <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="text-xl">{item.icon}</div>
                      <div>
                        <p className="font-bold text-sm text-stone-800">{item.action}</p>
                        <p className="text-xs text-stone-400">{item.date}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg">+{item.paws}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {profileTab === 'BADGES' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 rounded-3xl text-white shadow-lg mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold opacity-80 uppercase tracking-wide">Current Title</p>
                  <h2 className="text-2xl font-black mt-1">{userProfile.level}</h2>
                </div>
                <Award size={32} className="text-yellow-300" />
              </div>
              <p className="text-xs mt-4 opacity-90">Earn <span className="font-bold">550 more paws</span> to reach Rescue Champion</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {BADGES.map(badge => (
                <div key={badge.id} className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 p-2 text-center border ${badge.unlocked ? 'bg-white border-orange-100 shadow-sm' : 'bg-stone-50 border-stone-100 opacity-60 grayscale'}`}>
                  <div className="text-3xl">{badge.icon}</div>
                  <p className="text-[10px] font-bold text-stone-700 leading-tight">{badge.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );

  const renderReportingFlow = () => {
    switch(view) {
      case View.CAMERA:
        return (
          <div className="h-full bg-black relative flex flex-col">
             <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
             <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
             <button onClick={() => setView(View.FEED)} className="absolute top-6 right-6 text-white z-10 bg-black/20 p-2 rounded-full backdrop-blur"><X size={24} /></button>
             
             <div className="flex-1 flex flex-col items-center justify-center cursor-pointer space-y-4" onClick={() => cameraInputRef.current?.click()}>
                <div className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center animate-pulse">
                   <Camera size={48} className="text-white/80" />
                </div>
                <p className="text-white/80 font-medium">Tap to Capture Evidence</p>
             </div>
             
             <div className="h-32 bg-black/40 backdrop-blur-xl absolute bottom-0 left-0 right-0 flex items-center justify-center pb-8">
                <button onClick={() => galleryInputRef.current?.click()} className="flex items-center gap-2 text-white/60 hover:text-white border border-white/20 px-4 py-2 rounded-full text-xs font-bold">
                   <ImageIcon size={16} /> Upload from Gallery
                </button>
             </div>
          </div>
        );

      case View.REPORT_LOCATION:
        return (
          <div className="h-full bg-white flex flex-col">
             <div className="p-6 pt-12 border-b border-stone-100">
                <ReportingProgressBar step={2} />
                <h2 className="text-2xl font-bold text-stone-800">Confirm Location</h2>
                <p className="text-stone-500 text-sm mt-1">Drag pin to adjust exact spot.</p>
             </div>
             <div className="flex-1 bg-stone-100 relative group">
                <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/72.9781,19.2183,15,0/600x800?access_token=Pk.mock')] bg-cover"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-8 cursor-grab active:cursor-grabbing">
                   <MapPin size={48} className="text-red-500 drop-shadow-xl" fill="currentColor" />
                </div>
                <div className="absolute bottom-6 left-4 right-4 bg-white p-4 rounded-2xl shadow-lg">
                   <div className="flex items-center gap-2 text-stone-800 font-bold text-sm mb-2">
                      <MapPin size={16} className="text-orange-500" /> {reportData.location}
                   </div>
                   <input 
                      type="text" 
                      placeholder="Add nearby landmark (optional)" 
                      className="w-full bg-stone-50 p-3 rounded-xl text-sm outline-none border border-stone-200 focus:border-orange-500"
                      onChange={(e) => setReportData({...reportData, landmark: e.target.value})}
                   />
                </div>
             </div>
             <div className="p-4 border-t border-stone-100">
                <Button onClick={() => setView(View.REPORT_DETAILS)}>Confirm Location</Button>
             </div>
          </div>
        );

      case View.REPORT_DETAILS:
        return (
          <div className="h-full bg-white flex flex-col">
             <div className="p-6 pt-12">
                <ReportingProgressBar step={3} />
                <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
                  Condition Details
                  {isAutoFilling && <Loader2 size={20} className="animate-spin text-orange-500" />}
                </h2>
                {isAutoFilling && <p className="text-xs text-orange-600 font-bold mt-1">AI is analyzing your image to auto-fill details...</p>}
             </div>
             <div className="flex-1 overflow-y-auto px-6 pb-6">
                <div className="mb-6">
                   <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 block">What's wrong? (Select all)</label>
                   <div className="grid grid-cols-3 gap-3">
                      {CONDITION_TAGS.map(tag => (
                         <button 
                            key={tag.label}
                            onClick={() => toggleTag(tag.label)}
                            className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                               reportData.tags.includes(tag.label) 
                               ? 'bg-orange-50 border-orange-500 text-orange-700' 
                               : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                            }`}
                         >
                            <span className="text-2xl">{tag.icon}</span>
                            <span className="text-[10px] font-bold">{tag.label}</span>
                         </button>
                      ))}
                   </div>
                </div>

                <div className="mb-6">
                   <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 block">Severity</label>
                   <div className="grid grid-cols-3 gap-2 bg-stone-100 p-1 rounded-2xl">
                      {['Mild', 'Serious', 'Critical'].map(level => (
                         <button
                            key={level}
                            onClick={() => setReportData({...reportData, urgency: level})}
                            className={`py-3 rounded-xl text-xs font-bold transition-all ${
                               reportData.urgency === level 
                               ? (level === 'Critical' ? 'bg-red-500 text-white shadow-md' : 'bg-white text-stone-800 shadow-sm')
                               : 'text-stone-500 hover:text-stone-700'
                            }`}
                         >
                            {level}
                         </button>
                      ))}
                   </div>
                </div>

                <div>
                   <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 block">Description</label>
                   <div className="relative">
                      <textarea 
                         rows={4} 
                         className="w-full bg-stone-50 p-4 rounded-2xl text-sm outline-none border border-stone-200 focus:border-orange-500 resize-none"
                         placeholder="Describe the situation..."
                         value={reportData.desc}
                         onChange={(e) => setReportData({...reportData, desc: e.target.value})}
                      ></textarea>
                      <button className="absolute bottom-3 right-3 p-2 bg-white rounded-full shadow-sm text-stone-400 hover:text-orange-500">
                         <Mic size={16} />
                      </button>
                   </div>
                </div>
             </div>
             <div className="p-4 border-t border-stone-100">
                <Button onClick={() => setView(View.REPORT_REPORTER)}>Next Step</Button>
             </div>
          </div>
        );

      case View.REPORT_REPORTER:
        return (
          <div className="h-full bg-white flex flex-col">
             <div className="p-6 pt-12">
                <ReportingProgressBar step={4} />
                <h2 className="text-2xl font-bold text-stone-800">Reporter Details</h2>
                <p className="text-stone-500 text-sm mt-1">We need this to coordinate the rescue.</p>
             </div>
             <div className="flex-1 px-6 pt-4">
                <div className="space-y-4">
                   <div>
                      <label className="text-xs font-bold text-stone-400 uppercase mb-2 block">Name</label>
                      <input type="text" value={reportData.reporterName} className="w-full p-4 bg-stone-50 rounded-2xl font-bold text-stone-700 outline-none" readOnly />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-stone-400 uppercase mb-2 block">Phone Number</label>
                      <input type="text" value={reportData.reporterPhone} className="w-full p-4 bg-stone-50 rounded-2xl font-bold text-stone-700 outline-none" readOnly />
                   </div>
                   
                   <div className="bg-orange-50 p-4 rounded-2xl flex items-center justify-between border border-orange-100 mt-6">
                      <div className="flex items-center gap-3">
                         <div className="bg-white p-2 rounded-full text-orange-500"><Phone size={18} /></div>
                         <div>
                            <p className="text-sm font-bold text-stone-800">Allow Volunteers to Call</p>
                            <p className="text-[10px] text-stone-500">Faster coordination for rescue.</p>
                         </div>
                      </div>
                      <div 
                         className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${reportData.allowCall ? 'bg-green-500' : 'bg-stone-300'}`}
                         onClick={() => setReportData({...reportData, allowCall: !reportData.allowCall})}
                      >
                         <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${reportData.allowCall ? 'translate-x-6' : ''}`}></div>
                      </div>
                   </div>
                   
                   <p className="text-xs text-stone-400 text-center mt-4 flex items-center justify-center gap-1">
                      <ShieldAlert size={12} /> Your details are shared securely only with assigned rescuers.
                   </p>
                </div>
             </div>
             <div className="p-4 border-t border-stone-100">
                <Button onClick={() => setView(View.REPORT_REVIEW)}>Review Report</Button>
             </div>
          </div>
        );

      case View.REPORT_REVIEW:
        return (
          <div className="h-full bg-stone-50 flex flex-col">
             <div className="p-6 pt-12 bg-white pb-4 border-b border-stone-100">
                <ReportingProgressBar step={5} />
                <h2 className="text-2xl font-bold text-stone-800">Review & Submit</h2>
             </div>
             <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-stone-100">
                   <div className="h-48 bg-stone-200 relative">
                      <img src={reportData.image || ''} className="w-full h-full object-cover" alt="Evidence" />
                      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                         <MapPin size={12} /> {reportData.location}
                      </div>
                   </div>
                   <div className="p-5">
                      <div className="flex gap-2 mb-4 flex-wrap">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                            reportData.urgency === 'Critical' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200'
                         }`}>
                            {reportData.urgency} Priority
                         </span>
                         {reportData.tags.map(tag => (
                            <span key={tag} className="px-3 py-1 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                               {tag}
                            </span>
                         ))}
                      </div>
                      <p className="text-sm text-stone-600 leading-relaxed font-medium">
                         "{reportData.desc || 'No description provided.'}"
                      </p>
                   </div>
                </div>
                
                <div className="mt-6 text-center">
                   <p className="text-xs text-stone-400 mb-4">By submitting, you confirm this information is accurate.</p>
                   <Button onClick={submitFinalReport} className="shadow-xl shadow-orange-200 py-4 text-sm">
                      Submit Emergency Report
                   </Button>
                   <Button variant="ghost" onClick={() => setView(View.REPORT_DETAILS)} className="mt-2">Edit Details</Button>
                </div>
             </div>
          </div>
        );
        
      default: return null;
    }
  };

  const renderRescueStatus = () => (
    <div className="h-full bg-white flex flex-col items-center justify-center p-6 text-center">
       <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4"><Check size={40} /></div>
       <h2 className="text-2xl font-bold">Posted!</h2>
       <div className="mt-4 p-3 bg-orange-50 text-orange-700 rounded-xl font-bold border border-orange-200">
          +50 Paws Earned 🐾
       </div>
       <Button onClick={() => setView(View.FEED)} variant="secondary" className="mt-8">Back to Feed</Button>
    </div>
  );

  const renderContent = () => {
    if ([View.CAMERA, View.REPORT_LOCATION, View.REPORT_DETAILS, View.REPORT_REPORTER, View.REPORT_REVIEW].includes(view)) {
      return renderReportingFlow();
    }

    switch(view) {
      case View.FEED: return renderFeed();
      case View.MAPS: return renderMaps();
      case View.NAVIGATION: return renderNavigation();
      case View.AI_CHAT: return renderVetAI();
      case View.PROFILE: return renderProfile();
      case View.RESCUE_STATUS: return renderRescueStatus();
      default: return renderFeed();
    }
  };

  return (
    <div className="w-full h-screen sm:h-[850px] sm:max-w-md sm:mx-auto bg-white sm:shadow-2xl overflow-hidden relative font-sans text-stone-800 sm:border-x border-stone-200 flex flex-col sm:rounded-[2.5rem] sm:my-8 sm:ring-8 ring-stone-900/5">
      {renderContent()}
      
      {[View.FEED, View.MAPS, View.AI_CHAT, View.PROFILE].includes(view) && (
        <BottomNav setView={setView} currentView={view} />
      )}
    </div>
  );
}