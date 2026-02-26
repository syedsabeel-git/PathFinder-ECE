import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, 
  BookOpen, 
  Wrench, 
  Heart, 
  ArrowRight, 
  Sparkles, 
  GraduationCap,
  Briefcase,
  Lightbulb,
  Loader2,
  History,
  Save,
  Trash2,
  ChevronRight,
  Plus,
  X,
  Upload,
  FileText,
  Scan,
  AlertCircle
} from 'lucide-react';
import { getCareerRecommendations, CareerRecommendation, scanResume } from './services/geminiService';

interface HistoryItem {
  id: string;
  title: string;
  date: string;
  recommendation: CareerRecommendation;
  inputs: {
    education: string;
    skills: string;
    interests: string;
  };
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'navigator' | 'history'>('navigator');
  const [education, setEducation] = useState('');
  const [skills, setSkills] = useState('');
  const [interests, setInterests] = useState('');
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [recommendation, setRecommendation] = useState<CareerRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // File Upload State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('ece_career_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage
  const saveToLocalStorage = (newHistory: HistoryItem[]) => {
    localStorage.setItem('ece_career_history', JSON.stringify(newHistory));
    setHistory(newHistory);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!education || !skills || !interests) return;

    setLoading(true);
    setError(null);
    try {
      const result = await getCareerRecommendations(education, skills, interests);
      setRecommendation(result);
    } catch (err) {
      setError('Failed to get recommendations. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      if (validTypes.includes(file.type) || file.name.endsWith('.pdf') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
        setUploadedFile(file);
        setError(null);
      } else {
        setError('Please upload a PDF or Word document.');
        setUploadedFile(null);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validTypes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      if (validTypes.includes(file.type) || file.name.endsWith('.pdf') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
        setUploadedFile(file);
        setError(null);
      } else {
        setError('Please upload a PDF or Word document.');
        setUploadedFile(null);
      }
    }
  };

  const handleScan = async () => {
    if (!uploadedFile) return;

    setIsScanning(true);
    setError(null);
    setRecommendation(null);

    try {
      const base64 = await fileToBase64(uploadedFile);
      const mimeType = uploadedFile.type || 'application/pdf';
      
      // 1. Scan and extract data
      const extractedData = await scanResume(base64, mimeType);
      
      // 2. Update form fields
      setEducation(extractedData.education);
      setSkills(extractedData.skills);
      setInterests(extractedData.interests);

      // 3. Generate recommendations automatically
      const result = await getCareerRecommendations(
        extractedData.education,
        extractedData.skills,
        extractedData.interests
      );
      setRecommendation(result);
    } catch (err) {
      setError('Failed to scan resume. Please try manual input.');
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = () => {
    if (!recommendation || !saveTitle.trim()) return;

    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      title: saveTitle,
      date: new Date().toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      recommendation,
      inputs: { education, skills, interests }
    };

    const newHistory = [newItem, ...history];
    saveToLocalStorage(newHistory);
    setIsSaveModalOpen(false);
    setSaveTitle('');
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHistory = history.filter(item => item.id !== id);
    saveToLocalStorage(newHistory);
  };

  const viewHistoryItem = (item: HistoryItem) => {
    setRecommendation(item.recommendation);
    setEducation(item.inputs.education);
    setSkills(item.inputs.skills);
    setInterests(item.inputs.interests);
    setActiveTab('navigator');
  };

  const reset = () => {
    setRecommendation(null);
    setEducation('');
    setSkills('');
    setInterests('');
    setUploadedFile(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <Cpu size={20} />
            </div>
            <span className="font-bold tracking-tight text-lg">ECE Career Navigator</span>
          </div>
          
          <nav className="flex items-center bg-black/5 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('navigator')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'navigator' ? 'bg-white text-black shadow-sm' : 'text-black/50 hover:text-black'}`}
            >
              Navigator
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-black shadow-sm' : 'text-black/50 hover:text-black'}`}
            >
              <History size={14} /> History
              {history.length > 0 && (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 rounded-full">
                  {history.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {activeTab === 'navigator' ? (
            <motion.div 
              key="navigator"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid lg:grid-cols-[1fr_1.5fr] gap-12 items-start"
            >
              {/* Input Section */}
              <div className="space-y-8">
                <div>
                  <h1 className="text-4xl font-bold tracking-tight mb-4">
                    Chart your <span className="text-emerald-600">ECE future.</span>
                  </h1>
                  <p className="text-black/60 leading-relaxed">
                    Enter your current profile or <span className="font-semibold text-black">upload your resume</span> to discover tailored career paths.
                  </p>
                </div>

                {/* File Upload Area */}
                <div className="space-y-4">
                  <label className="text-xs font-semibold uppercase tracking-wider text-black/50 flex items-center gap-2">
                    <Upload size={14} /> Scan Resume (PDF/DOC)
                  </label>
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center gap-3
                      ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-black/10 bg-white hover:border-emerald-500/50 hover:bg-emerald-50/30'}
                      ${uploadedFile ? 'border-emerald-500 bg-emerald-50/50' : ''}
                    `}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                    />
                    
                    {uploadedFile ? (
                      <>
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                          <FileText size={24} />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-sm text-black truncate max-w-[200px]">{uploadedFile.name}</p>
                          <p className="text-xs text-black/40">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedFile(null);
                          }}
                          className="absolute top-4 right-4 p-1.5 hover:bg-black/5 rounded-full text-black/40 hover:text-red-500 transition-all"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-black/5 text-black/20 rounded-xl flex items-center justify-center">
                          <Upload size={24} />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-sm">Click or drag to upload</p>
                          <p className="text-xs text-black/40">PDF, DOC, DOCX up to 10MB</p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {uploadedFile && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={handleScan}
                      disabled={isScanning}
                      className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10 disabled:opacity-50"
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="animate-spin" size={18} /> Scanning...
                        </>
                      ) : (
                        <>
                          <Scan size={18} /> Scan Now
                        </>
                      )}
                    </motion.button>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-black/5"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#F8F9FA] px-4 text-black/30 font-bold tracking-widest">OR MANUAL INPUT</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-xs font-semibold uppercase tracking-wider text-black/50 flex items-center gap-2">
                      <Sparkles size={14} /> Quick Start Templates
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'VLSI', skills: 'Verilog, Digital Logic, CMOS, SPICE', interests: 'Chip Design, ASIC, FPGA' },
                        { label: 'Embedded', skills: 'C/C++, Microcontrollers, RTOS, I2C', interests: 'Firmware, IoT, ESP32' },
                        { label: 'Robotics', skills: 'Python, Control Systems, Arduino', interests: 'Automation, ROS, Mechatronics' },
                        { label: 'Telecom', skills: 'MATLAB, Signal Processing, TCP/IP', interests: 'Wireless, 5G, Networking' }
                      ].map((tmpl) => (
                        <button
                          key={tmpl.label}
                          type="button"
                          onClick={() => {
                            setSkills(tmpl.skills);
                            setInterests(tmpl.interests);
                          }}
                          className="px-3 py-1.5 bg-white border border-black/10 rounded-lg text-xs font-medium hover:border-emerald-500 hover:text-emerald-600 transition-all cursor-pointer"
                        >
                          {tmpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-black/50 flex items-center gap-2">
                      <GraduationCap size={14} /> Education
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3rd Year B.Tech in ECE"
                      className="w-full px-4 py-3 rounded-xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-black/50 flex items-center gap-2">
                      <Wrench size={14} /> Current Skills
                    </label>
                    <textarea
                      placeholder="e.g. Verilog, Arduino, Python, Circuit Design"
                      className="w-full px-4 py-3 rounded-xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all min-h-[100px] resize-none"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-black/50 flex items-center gap-2">
                      <Heart size={14} /> Interests
                    </label>
                    <textarea
                      placeholder="e.g. VLSI, Embedded Systems, Robotics, IoT"
                      className="w-full px-4 py-3 rounded-xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all min-h-[100px] resize-none"
                      value={interests}
                      onChange={(e) => setInterests(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:hover:bg-black"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        Generate Roadmap <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Output Section */}
              <div className="relative min-h-[400px]">
                <AnimatePresence mode="wait">
                  {!recommendation && !loading && !isScanning && !error && (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-black/5 rounded-3xl bg-white/50"
                    >
                      <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-4">
                        <Sparkles size={32} />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Ready to explore?</h3>
                      <p className="text-black/40 max-w-xs">
                        Fill out the form or upload a resume to see your personalized career recommendations.
                      </p>
                    </motion.div>
                  )}

                  {(loading || isScanning) && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex flex-col items-center justify-center text-center p-12"
                    >
                      <div className="relative">
                        <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                        <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600" size={24} />
                      </div>
                      <h3 className="text-xl font-semibold mt-6 mb-2">
                        {isScanning ? 'Scanning your resume...' : 'Analyzing your profile...'}
                      </h3>
                      <p className="text-black/40">
                        {isScanning ? 'Extracting skills and education details.' : 'Consulting our ECE career database.'}
                      </p>
                    </motion.div>
                  )}

                  {error && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex flex-col items-center justify-center text-center p-12 bg-red-50 rounded-3xl border border-red-100"
                    >
                      <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle size={24} />
                      </div>
                      <p className="text-red-600 font-medium">{error}</p>
                      <button 
                        onClick={() => setError(null)}
                        className="mt-4 text-sm font-semibold underline"
                      >
                        Try again
                      </button>
                    </motion.div>
                  )}

                  {recommendation && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Summary Card */}
                      <div className="bg-emerald-600 text-white p-8 rounded-3xl shadow-xl shadow-emerald-900/10 relative overflow-hidden">
                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">Your Profile Analysis</h3>
                            <button 
                              onClick={() => setIsSaveModalOpen(true)}
                              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm transition-all"
                            >
                              <Save size={12} /> Save to History
                            </button>
                          </div>
                          <p className="text-xl font-medium leading-relaxed italic">
                            "{recommendation.summary}"
                          </p>
                        </div>
                        <Sparkles className="absolute -right-4 -bottom-4 text-white/10" size={120} />
                      </div>

                      <div className="grid gap-6">
                        {/* Career Paths */}
                        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                              <Briefcase size={20} />
                            </div>
                            <h4 className="font-bold text-lg">Suggested Career Paths</h4>
                          </div>
                          <ul className="space-y-3">
                            {recommendation.careerPaths.map((path, i) => (
                              <li key={i} className="flex items-start gap-3 group">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 group-hover:scale-150 transition-transform" />
                                <span className="text-black/70 font-medium">{path}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Internship Roles */}
                        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                              <BookOpen size={20} />
                            </div>
                            <h4 className="font-bold text-lg">Internship Roles</h4>
                          </div>
                          <ul className="space-y-3">
                            {recommendation.internshipRoles.map((role, i) => (
                              <li key={i} className="flex items-start gap-3 group">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 group-hover:scale-150 transition-transform" />
                                <span className="text-black/70 font-medium">{role}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Skills to Learn */}
                        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                              <Lightbulb size={20} />
                            </div>
                            <h4 className="font-bold text-lg">Skills to Learn Next</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {recommendation.skillsToLearn.map((skill, i) => (
                              <span 
                                key={i} 
                                className="px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm font-semibold border border-amber-100"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <button
                          onClick={() => setIsSaveModalOpen(true)}
                          className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10"
                        >
                          <Save size={18} /> Save this Roadmap
                        </button>

                        <button
                          onClick={reset}
                          className="w-full py-4 border-2 border-dashed border-black/10 rounded-2xl text-black/40 font-semibold hover:border-emerald-500 hover:text-emerald-600 transition-all"
                        >
                          Start New Analysis
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight mb-2">Saved Roadmaps</h2>
                  <p className="text-black/60">Review your previously generated career paths.</p>
                </div>
                {history.length > 0 && (
                  <button 
                    onClick={() => {
                      if(confirm('Clear all history?')) saveToLocalStorage([]);
                    }}
                    className="text-red-500 text-sm font-medium hover:underline flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Clear All
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-black/5 rounded-3xl bg-white/50">
                  <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center text-black/20 mb-4">
                    <History size={32} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No history yet</h3>
                  <p className="text-black/40 max-w-xs mb-6">
                    Your saved career roadmaps will appear here for easy access.
                  </p>
                  <button 
                    onClick={() => setActiveTab('navigator')}
                    className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 transition-all"
                  >
                    <Plus size={18} /> Create First Roadmap
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {history.map((item) => (
                    <motion.div 
                      key={item.id}
                      layoutId={item.id}
                      onClick={() => viewHistoryItem(item)}
                      className="group bg-white p-6 rounded-3xl border border-black/5 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <h4 className="font-bold text-lg group-hover:text-emerald-600 transition-colors">{item.title}</h4>
                          <p className="text-xs text-black/40 font-medium">{item.date}</p>
                        </div>
                        <button 
                          onClick={(e) => deleteHistoryItem(item.id, e)}
                          className="p-2 text-black/20 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 text-xs text-black/60">
                          <GraduationCap size={12} className="text-emerald-600" />
                          <span className="truncate">{item.inputs.education}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-black/60">
                          <Wrench size={12} className="text-emerald-600" />
                          <span className="truncate">{item.inputs.skills}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-black/5">
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">View Full Roadmap</span>
                        <ChevronRight size={16} className="text-black/20 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Save Modal */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSaveModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Save Roadmap</h3>
                <button 
                  onClick={() => setIsSaveModalOpen(false)}
                  className="p-2 hover:bg-black/5 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-black/60">Give this roadmap a title to easily find it later in your history.</p>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-black/40">Roadmap Title</label>
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="e.g. VLSI Specialization Plan"
                    className="w-full px-4 py-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  />
                </div>
                <button 
                  onClick={handleSave}
                  disabled={!saveTitle.trim()}
                  className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  Save to History
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-black/5 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-black/40 text-sm">
          <p>© 2026 ECE Career Navigator. Built for engineers.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-emerald-600 transition-colors">Documentation</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
