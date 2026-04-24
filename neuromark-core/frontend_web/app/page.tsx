"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Crosshair, Fingerprint, Network, Flame, ShieldCheck, Layers, Activity, Server, Database, Lock, LayoutDashboard, RefreshCw, Download, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';

const mockChartData = [
  { time: '0ms', confidence: 1.0, psnr: 45 },
  { time: '10ms', confidence: 0.99, psnr: 42 },
  { time: '20ms', confidence: 0.95, psnr: 38 },
  { time: '30ms', confidence: 0.91, psnr: 36 },
  { time: '40ms', confidence: 0.88, psnr: 35 },
  { time: '50ms', confidence: 0.45, psnr: 20 }, // Attack simulation
  { time: '60ms', confidence: 0.85, psnr: 32 }, // Recovery
  { time: '70ms', confidence: 0.92, psnr: 38 }
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('threat-lab');
  const [isScanning, setIsScanning] = useState(false);
  const [isProtecting, setIsProtecting] = useState(false);
  const [metrics, setMetrics] = useState({ score: '--', ber: '--', payload: '...' });
  const [isConnected, setIsConnected] = useState(false);
  const [scanImage, setScanImage] = useState("https://images.unsplash.com/photo-1550751827-4bd374c3f58b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80");
  const [scanData, setScanData] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'ALL' | 'VERIFICATION' | 'PROTECTION'>('ALL');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'AUTH' | 'TAMPER'>('ALL');

  const [policies, setPolicies] = useState([
    { title: "Drop Unauthenticated Streams", state: "ENFORCED", color: "cyber-blue" },
    { title: "Aggressive Bitrate Decoding", state: "WARN ONLY", color: "cyber-neon" },
    { title: "Reject Suspicious Meta", state: "ENFORCED", color: "cyber-blue" },
    { title: "Adversarial Noise Purge", state: "INACTIVE", color: "gray-500" }
  ]);

  const togglePolicy = (index: number) => {
    const p = [...policies];
    if(p[index].state === "ENFORCED") {
      p[index].state = "INACTIVE"; p[index].color = "gray-500";
    } else if(p[index].state === "INACTIVE") {
      p[index].state = "WARN ONLY"; p[index].color = "cyber-neon";
    } else {
      p[index].state = "ENFORCED"; p[index].color = "cyber-blue";
    }
    setPolicies(p);
  };

  const triggerScan = () => {
    document.getElementById('file-upload')?.click();
  };

  const loadHistory = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/history');
      if (res.ok) {
        const rows = await res.json();
        setHistory(rows);
      }
    } catch {
      // ignore history failures in UI
    }
  };

  useEffect(() => {
    loadHistory();

    const timer = setInterval(() => {
      loadHistory();
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  const handleFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
        setScanImage(URL.createObjectURL(file));
    }
    
    setIsScanning(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('http://localhost:8000/api/v1/verify', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setScanData(data);
        setMetrics({
          score: data.trust_score.toString(),
          ber: data.ber.toString(),
          payload: data.extracted_signature
        });
        setIsConnected(true);
        await loadHistory();
      }
    } catch (err) {
      console.error(err);
      setIsConnected(false);
    }
    setIsScanning(false);
  };

  const navItems = [
    { id: 'threat-lab', label: 'Adversarial Threat Lab', icon: Flame },
    { id: 'provenance', label: 'Provenance Graph', icon: Network },
    { id: 'tamper-map', label: 'Tamper Heatmap', icon: Crosshair },
    { id: 'policy', label: 'Tripwire Policies', icon: Layers },
    { id: 'admin', label: 'Admin Control Panel', icon: LayoutDashboard }
  ];

  const handleKmsConnect = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/kms/connect');
      setIsConnected(res.ok);
    } catch {
      setIsConnected(false);
    }
  };

  const handleProtectAsset = async () => {
    if (!selectedFile) return;
    setIsProtecting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch('http://localhost:8000/api/v1/protect', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setMetrics((prev) => ({
          ...prev,
          score: data.new_trust_score?.toString?.() ?? prev.score,
          payload: data.signature ?? prev.payload,
        }));
        await loadHistory();
      }
    } finally {
      setIsProtecting(false);
    }
  };

  const chartData = scanData?.chart_data ?? mockChartData;

  const filteredHistory = history
    .filter((item) => {
      if (historyTypeFilter !== 'ALL' && item.type !== historyTypeFilter) return false;
      const status = item.verified ? 'AUTH' : 'TAMPER';
      if (historyStatusFilter !== 'ALL' && status !== historyStatusFilter) return false;
      if (historySearch.trim()) {
        return String(item.filename ?? '').toLowerCase().includes(historySearch.trim().toLowerCase());
      }
      return true;
    });

  const totalScans = history.length;
  const verifiedCount = history.filter((h) => h.verified).length;
  const tamperCount = history.filter((h) => !h.verified).length;
  const protectionCount = history.filter((h) => h.type === 'PROTECTION').length;
  const avgTrust = totalScans > 0
    ? (history.reduce((acc, item) => acc + Number(item.trust_score || 0), 0) / totalScans).toFixed(2)
    : '--';

  const trendData = [...history]
    .slice(0, 10)
    .reverse()
    .map((item, index) => ({
      idx: index + 1,
      trust: Number(item.trust_score || 0),
      ber: Number(item.ber || 0),
    }));

  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neuromark-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-10 pb-6 border-b border-cyber-blue/20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyber-blue/10 rounded-xl border border-cyber-blue/40 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <ShieldCheck className="w-8 h-8 text-cyber-blue" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyber-blue to-white neon-text">NeuroMark</h1>
            <p className="text-xs tracking-[0.2em] text-cyber-blue/70 uppercase">Enterprise Digital Protection</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-gray-500">System Status</span>
            <span className={`flex items-center gap-2 text-sm font-mono ${isConnected ? 'text-cyber-neon' : 'text-gray-500'}`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-cyber-neon' : 'bg-gray-500'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-cyber-neon' : 'bg-gray-500'}`}></span>
              </span>
              {isConnected ? 'SECURE CONNECTION' : 'WAITING FOR KMS...'}
            </span>
          </div>
          <button onClick={handleKmsConnect} className="px-6 py-2 bg-cyber-800 border border-cyber-blue/50 text-cyber-blue hover:bg-cyber-blue/10 transition-all font-mono text-sm shadow-[0_0_10px_rgba(0,240,255,0.2)]">
            CONNECT KMS
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-8 h-[calc(100vh-200px)]">
        
        {/* Navigation Sidebar */}
        <div className="col-span-3 flex flex-col gap-4">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-4 p-4 text-left border transition-all glass-panel ${
                activeTab === item.id 
                ? 'border-cyber-blue/60 bg-cyber-blue/10 shadow-[0_0_20px_rgba(0,240,255,0.15)] text-white' 
                : 'border-white/5 text-gray-400 hover:border-white/20'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-cyber-blue' : 'text-gray-500'}`} />
              <span className="font-semibold uppercase tracking-wider text-sm">{item.label}</span>
            </button>
          ))}

          <div className="mt-auto glass-panel p-6 border-white/5">
            <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4">Fast Actions</h3>
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              accept=".png,.jpg,.jpeg,.mp4" 
              onChange={handleFileUpload} 
            />
            <button onClick={triggerScan} disabled={isScanning} className="w-full py-3 bg-gradient-to-r from-cyber-purple/20 to-cyber-blue/20 border border-cyber-purple/50 text-white font-mono text-sm hover:from-cyber-purple/40 hover:to-cyber-blue/40 transition-all relative overflow-hidden group">
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Fingerprint className="w-4 h-4" /> 
                {isScanning ? 'SCANNING TENSORS...' : 'UPLOAD & SCAN ASSET'}
              </span>
              {isScanning && (
                <motion.div 
                  initial={{ top: '-100%' }} 
                  animate={{ top: '100%' }} 
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="absolute left-0 w-full h-[20%] bg-cyber-blue/30 blur-[5px]" 
                />
              )}
            </button>
            <button
              onClick={handleProtectAsset}
              disabled={!selectedFile || isProtecting}
              className="mt-3 w-full py-3 bg-cyber-blue/10 border border-cyber-blue/40 text-cyber-blue font-mono text-xs hover:bg-cyber-blue/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isProtecting ? 'APPLYING PROTECTION...' : 'PROTECT LAST UPLOAD'}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="col-span-9 relative">
          <AnimatePresence mode="wait">
            {activeTab === 'threat-lab' && (
              <motion.div
                key="threat-lab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex flex-col gap-6"
              >
                <div className="grid grid-cols-3 gap-6">
                  <div className="glass-panel p-6 border-l-4 border-l-cyber-neon border-y-white/5 border-r-white/5">
                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Global Trust Score</p>
                    <p className="text-4xl font-mono text-white tracking-widest">
                      {isScanning ? <span className="animate-pulse">--.--</span> : metrics.score}
                      <span className="text-lg text-cyber-neon ml-1">/ 100</span>
                    </p>
                    <p className="text-xs text-cyber-neon mt-2">Formula: S = w₁(1-BER) + w₂C + w₃PSNR + w₄A</p>
                  </div>
                  <div className="glass-panel p-6 border-l-4 border-l-cyber-blue border-y-white/5 border-r-white/5">
                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Bit Error Rate (BER)</p>
                    <p className="text-4xl font-mono text-white tracking-widest">{isScanning ? '--' : metrics.ber}</p>
                    <p className="text-xs text-cyber-blue mt-2">Zero-trust nonce challenge verified</p>
                  </div>
                  <div className="glass-panel p-6 border-l-4 border-l-cyber-purple border-y-white/5 border-r-white/5">
                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Recovered Payload</p>
                    <p className="text-xl font-mono text-cyber-purple truncate mt-2">{isScanning ? '0x...' : metrics.payload}</p>
                    <p className="text-xs text-gray-500 mt-2">Source: Enterprise API Tripwire</p>
                  </div>
                </div>

                <div className="flex-1 glass-panel border-white/5 p-6 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg uppercase tracking-widest font-semibold flex items-center gap-3">
                      <Activity className="text-cyber-blue" />
                      Codec Stress Sweep (PSNR vs Confidence)
                    </h2>
                  </div>
                  <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorPsnr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8a2be2" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8a2be2" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                        <XAxis dataKey="time" stroke="#4b5563" />
                        <YAxis yAxisId="left" stroke="#00f0ff" />
                        <YAxis yAxisId="right" orientation="right" stroke="#8a2be2" />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#11111a', border: '1px solid rgba(0,240,255,0.2)' }}
                          itemStyle={{ color: '#ffffff' }}
                        />
                        <Area yAxisId="left" type="monotone" dataKey="confidence" stroke="#00f0ff" fillOpacity={1} fill="url(#colorConfidence)" strokeWidth={3} />
                        <Area yAxisId="right" type="monotone" dataKey="psnr" stroke="#8a2be2" fillOpacity={1} fill="url(#colorPsnr)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'provenance' && (
              <motion.div
                key="provenance"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full glass-panel border-white/5 p-8 flex flex-col items-center justify-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyber-blue/10 via-transparent to-transparent opacity-50 block pointer-events-none" />
                <h2 className="text-2xl font-light text-white tracking-widest mb-12 uppercase">Content Provenance Stream</h2>
                <div className="flex items-center gap-4 w-full max-w-4xl justify-between relative z-10">
                  
                  {/* Node 1 */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                    className="flex flex-col items-center gap-3 w-1/4"
                  >
                    <div className="w-16 h-16 rounded-full border-2 border-cyber-blue flex items-center justify-center bg-cyber-blue/10 shadow-[0_0_20px_rgba(0,240,255,0.4)] relative">
                      <Fingerprint className="text-cyber-blue w-8 h-8" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyber-neon rounded-full animate-ping" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyber-neon rounded-full" />
                    </div>
                    <span className="text-xs uppercase tracking-widest font-mono text-cyber-blue text-center">Initial Gen<br/>0x88A...B9</span>
                  </motion.div>

                  {/* Edge 1 */}
                  <div className="flex-1 h-px bg-gradient-to-r from-cyber-blue to-cyber-purple relative">
                    <motion.div 
                      animate={{ x: ['0%', '400%'] }} 
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="absolute top-[-2px] left-0 w-8 h-1 bg-white shadow-[0_0_8px_#fff]" 
                    />
                  </div>

                  {/* Node 2 */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                    className="flex flex-col items-center gap-3 w-1/4"
                  >
                    <div className="w-16 h-16 rounded-full border-2 border-cyber-purple flex items-center justify-center bg-cyber-purple/10">
                      <Server className="text-cyber-purple w-8 h-8" />
                    </div>
                    <span className="text-xs uppercase tracking-widest font-mono text-cyber-purple text-center">CDN Host<br/>AWS-US-E1</span>
                  </motion.div>

                  <div className={`flex-1 h-px bg-gradient-to-r from-cyber-purple to-${scanData?.tamper_heatmap_enabled ? 'cyber-red' : 'cyber-neon'} relative`}>
                    <motion.div 
                        animate={{ x: ['0%', '400%'] }} 
                        transition={{ duration: 2, delay: 1, repeat: Infinity, ease: 'linear' }}
                        className={`absolute top-[-2px] left-0 w-8 h-1 shadow-[0_0_8px] z-20 ${scanData?.tamper_heatmap_enabled ? 'bg-cyber-red shadow-[0_0_8px_#ff003c]' : 'bg-cyber-neon shadow-[0_0_8px_#39ff14]'}`} 
                      />
                  </div>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                    className="flex flex-col items-center gap-3 w-1/4"
                  >
                    <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center relative ${
                      scanData?.tamper_heatmap_enabled 
                        ? 'border-cyber-red bg-cyber-red/10 shadow-[0_0_20px_rgba(255,0,60,0.4)]'
                        : 'border-cyber-neon bg-cyber-neon/10 shadow-[0_0_20px_rgba(57,255,20,0.4)]'
                    }`}>
                      {scanData?.tamper_heatmap_enabled ? <ShieldAlert className="text-cyber-red w-8 h-8" /> : <ShieldCheck className="text-cyber-neon w-8 h-8" />}
                      
                      {scanData?.tamper_heatmap_enabled ? (
                        <span className="absolute -bottom-2 px-2 py-0.5 bg-cyber-red text-[8px] text-white font-bold rounded">TAMPERED</span>
                      ) : (
                        <span className="absolute -bottom-2 px-2 py-0.5 bg-cyber-neon text-[8px] text-black font-bold rounded">AUTHENTIC</span>
                      )}
                    </div>
                    <span className={`text-xs uppercase tracking-widest font-mono text-center ${scanData?.tamper_heatmap_enabled ? 'text-cyber-red' : 'text-cyber-neon'}`}>
                      {scanData?.provenance_node?.split('[')[0]}<br/>
                      {scanData?.provenance_node?.split('[')[1]?.replace(']', '') || "Awaiting Node"}
                    </span>
                  </motion.div>

                </div>

                <div className="mt-16 p-4 border border-white/10 bg-black/40 max-w-2xl w-full text-center font-mono text-sm text-gray-400 rounded">
                  {scanData ? (
                     <>Neural Watermark {scanData.tamper_heatmap_enabled ? 'fractured' : 'persisted'} through <span className="text-cyber-blue font-bold">JPEG Compression (QF=50)</span> and <span className="text-cyber-blue font-bold">Cropping</span> at Node 3.</>
                  ) : "Awaiting scan processing..."}
                </div>
              </motion.div>
            )}

            {activeTab === 'admin' && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="h-full glass-panel border-white/5 p-6 flex flex-col gap-5 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-light text-white tracking-widest uppercase">Enterprise Admin Panel</h2>
                    <p className="text-xs text-gray-500 tracking-wider mt-1">Forensic observability, control, and audit history</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={loadHistory} className="px-3 py-2 border border-cyber-blue/40 text-cyber-blue text-xs font-mono hover:bg-cyber-blue/10 flex items-center gap-2">
                      <RefreshCw className="w-3 h-3" /> REFRESH
                    </button>
                    <button onClick={exportHistory} className="px-3 py-2 border border-cyber-purple/40 text-cyber-purple text-xs font-mono hover:bg-cyber-purple/10 flex items-center gap-2">
                      <Download className="w-3 h-3" /> EXPORT JSON
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4">
                  <div className="glass-panel p-4 border border-white/10">
                    <p className="text-[10px] uppercase text-gray-500">Total Scans</p>
                    <p className="text-2xl font-mono text-white mt-1">{totalScans}</p>
                  </div>
                  <div className="glass-panel p-4 border border-white/10">
                    <p className="text-[10px] uppercase text-gray-500">Authenticated</p>
                    <p className="text-2xl font-mono text-cyber-neon mt-1">{verifiedCount}</p>
                  </div>
                  <div className="glass-panel p-4 border border-white/10">
                    <p className="text-[10px] uppercase text-gray-500">Tamper Flags</p>
                    <p className="text-2xl font-mono text-cyber-red mt-1">{tamperCount}</p>
                  </div>
                  <div className="glass-panel p-4 border border-white/10">
                    <p className="text-[10px] uppercase text-gray-500">Protection Jobs</p>
                    <p className="text-2xl font-mono text-cyber-blue mt-1">{protectionCount}</p>
                  </div>
                  <div className="glass-panel p-4 border border-white/10">
                    <p className="text-[10px] uppercase text-gray-500">Avg Trust</p>
                    <p className="text-2xl font-mono text-white mt-1">{avgTrust}</p>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4 min-h-0 flex-1">
                  <div className="col-span-2 glass-panel border border-white/10 p-4 flex flex-col">
                    <p className="text-xs uppercase text-gray-400 mb-3">Trust + BER Trend (Latest 10)</p>
                    <div className="flex-1 min-h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                          <XAxis dataKey="idx" stroke="#6b7280" />
                          <YAxis yAxisId="left" stroke="#00f0ff" />
                          <YAxis yAxisId="right" orientation="right" stroke="#ff003c" />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#11111a', border: '1px solid rgba(255,255,255,0.1)' }} />
                          <Line yAxisId="left" type="monotone" dataKey="trust" stroke="#00f0ff" strokeWidth={2} dot={false} />
                          <Line yAxisId="right" type="monotone" dataKey="ber" stroke="#ff003c" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="col-span-3 glass-panel border border-white/10 p-4 flex flex-col min-h-0">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="relative flex-1">
                        <Search className="w-3 h-3 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          placeholder="Search by filename"
                          className="w-full bg-black/40 border border-white/10 text-xs text-white pl-8 pr-2 py-2 outline-none focus:border-cyber-blue/40"
                        />
                      </div>
                      <select value={historyTypeFilter} onChange={(e) => setHistoryTypeFilter(e.target.value as any)} className="bg-black/40 border border-white/10 text-xs text-gray-300 px-2 py-2">
                        <option value="ALL">ALL TYPES</option>
                        <option value="VERIFICATION">VERIFICATION</option>
                        <option value="PROTECTION">PROTECTION</option>
                      </select>
                      <select value={historyStatusFilter} onChange={(e) => setHistoryStatusFilter(e.target.value as any)} className="bg-black/40 border border-white/10 text-xs text-gray-300 px-2 py-2">
                        <option value="ALL">ALL STATUS</option>
                        <option value="AUTH">AUTH</option>
                        <option value="TAMPER">TAMPER</option>
                      </select>
                    </div>

                    <div className="flex-1 overflow-auto border border-white/10">
                      <table className="w-full text-xs font-mono">
                        <thead className="sticky top-0 bg-black/80 text-gray-400 uppercase tracking-wider">
                          <tr>
                            <th className="text-left p-2">Timestamp</th>
                            <th className="text-left p-2">Filename</th>
                            <th className="text-left p-2">Type</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-left p-2">Trust</th>
                            <th className="text-left p-2">BER</th>
                            <th className="text-left p-2">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredHistory.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-4 text-center text-gray-500">No scan records found for current filters.</td>
                            </tr>
                          ) : filteredHistory.map((item) => (
                            <tr key={item.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                              <td className="p-2 text-gray-400">{new Date(item.timestamp).toLocaleString()}</td>
                              <td className="p-2 text-white max-w-[180px] truncate">{item.filename}</td>
                              <td className="p-2 text-cyber-blue">{item.type}</td>
                              <td className={`p-2 ${item.verified ? 'text-cyber-neon' : 'text-cyber-red'}`}>{item.verified ? 'AUTH' : 'TAMPER'}</td>
                              <td className="p-2 text-white">{Number(item.trust_score).toFixed(2)}</td>
                              <td className="p-2 text-gray-300">{Number(item.ber).toFixed(4)}</td>
                              <td className="p-2">
                                <button
                                  onClick={() => setMetrics({
                                    score: Number(item.trust_score).toFixed(2),
                                    ber: Number(item.ber).toFixed(4),
                                    payload: 'HISTORICAL-LOAD',
                                  })}
                                  className="px-2 py-1 border border-cyber-blue/40 text-cyber-blue hover:bg-cyber-blue/10"
                                >
                                  Load
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Same for other tabs but keeping it concise for demo */}
            {(activeTab === 'tamper-map' || activeTab === 'policy') && (
              <motion.div
                key="other"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full glass-panel border-white/5 p-8 flex flex-col items-center justify-center gap-6"
              >
                {activeTab === 'tamper-map' ? (
                   <div className="w-full h-full flex flex-col items-center">
                     <h2 className="text-2xl font-light text-white tracking-widest mb-8 uppercase flex items-center gap-3">
                       <Crosshair className={scanData?.tamper_heatmap_enabled ? "text-cyber-red" : "text-cyber-blue"} /> 
                       Tamper Heatmap Overlay
                     </h2>
                     <div className="w-[450px] h-[300px] border border-white/20 bg-cover bg-center rounded-lg relative overflow-hidden group shadow-[0_0_30px_rgba(255,0,60,0.15)]"
                          style={{ backgroundImage: `url(${scanImage})` }}>
                       <div className="absolute inset-0 bg-cyber-blue/10 mix-blend-overlay group-hover:bg-transparent transition-colors duration-1000" />
                       <motion.div 
                          initial={{ left: '-100%' }} animate={{ left: '100%' }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                          className="absolute top-0 w-24 h-full bg-cyber-blue/30 blur-[20px] skew-x-[-10deg]" 
                        />
                        {/* Fake "tampered" zone that lights up in red */}
                        {scanData?.tamper_heatmap_enabled && scanData?.tamper_box && (
                          <>
                            <motion.div 
                              className="absolute bg-cyber-red mix-blend-color-dodge rounded blur-[15px]"
                              style={{ 
                                top: scanData.tamper_box.top, 
                                left: scanData.tamper_box.left,
                                width: scanData.tamper_box.width,
                                height: scanData.tamper_box.height
                              }}
                              animate={{ opacity: [0.3, 0.8, 0.4] }}
                              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            />
                            <div className="absolute top-4 right-4 bg-black/80 px-2 py-1 text-[10px] text-cyber-red border border-cyber-red/20 uppercase font-mono animate-pulse">Deepfake Insert Detected</div>
                          </>
                        )}
                        {scanData && !scanData.tamper_heatmap_enabled && (
                          <div className="absolute top-4 right-4 bg-black/80 px-2 py-1 text-[10px] text-cyber-neon border border-cyber-neon/20 uppercase font-mono">Authentic File</div>
                        )}
                     </div>
                   </div>
                ) : (
                   <div className="w-full h-full flex flex-col">
                      <h2 className="text-2xl font-light text-white tracking-widest mb-8 uppercase flex items-center gap-3"><Database className="text-cyber-blue" /> KMS Tripwire Policies</h2>
                      
                      <div className="flex flex-col gap-4">
                        {policies.map((rule, i) => (
                          <div 
                             key={i} 
                             onClick={() => togglePolicy(i)}
                             className="flex justify-between items-center p-4 glass-panel border border-white/5 hover:border-white/20 transition-all cursor-pointer group"
                          >
                             <div className="flex items-center gap-3">
                               <Lock className={`w-5 h-5 text-${rule.color} group-hover:text-white`} />
                               <span className="font-mono text-sm tracking-wide text-gray-300">{rule.title}</span>
                             </div>
                             <div className={`text-xs font-bold text-${rule.color} bg-black/50 px-3 py-1 rounded shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] border border-${rule.color}/30`}>
                               {rule.state}
                             </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8 border border-white/10 rounded-lg p-4 bg-black/20">
                        <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-3">Recent Scan History</h3>
                        <div className="space-y-2 max-h-56 overflow-auto pr-2">
                          {history.length === 0 ? (
                            <div className="text-xs text-gray-500 font-mono">No scans recorded yet.</div>
                          ) : (
                            history.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-xs font-mono border border-white/5 rounded px-2 py-2">
                                <span className="text-gray-300 truncate max-w-[45%]">{item.filename}</span>
                                <span className={item.verified ? 'text-cyber-neon' : 'text-cyber-red'}>{item.verified ? 'AUTH' : 'TAMPER'}</span>
                                <span className="text-cyber-blue">{item.trust_score?.toFixed ? item.trust_score.toFixed(2) : item.trust_score}</span>
                                <span className="text-gray-500">{item.type}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                   </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
