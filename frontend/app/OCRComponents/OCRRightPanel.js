//app/components/OCRRightPanel.js - ECG STYLE HEARTBEAT
"use client";
import { useState, useEffect } from "react";
import { usePanelWidth } from "../context/PanelWidthContext";
import { Clock, FileText, CheckCircle, AlertCircle, Activity, Eye, Heart, TrendingUp, Database } from "lucide-react";

export default function OCRRightPanel({ processing = false, estimatedTime = 0, results = null, file = null, isVisible = true }) {
  const { rightWidth } = usePanelWidth();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [heartbeat, setHeartbeat] = useState(72);
  const [cpuUsage, setCpuUsage] = useState(35);
  const [memoryUsage, setMemoryUsage] = useState(45);
  
  // 🔥 ECG HEARTBEAT DATA - Medical style with spikes
  const [ecgData, setEcgData] = useState(Array(100).fill(50));
  const [scanPosition, setScanPosition] = useState(0); // Scanning wave position
  const [cpuHistory, setCpuHistory] = useState(Array(30).fill(35));
  const [memoryHistory, setMemoryHistory] = useState(Array(30).fill(45));
  const [throughputHistory, setThroughputHistory] = useState(Array(30).fill(0));
  const [backendStats, setBackendStats] = useState(null);
  const [docCount, setDocCount] = useState(0);

  // Fetch live backend stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/ocr/stats');
        const data = await res.json();
        setBackendStats(data);
      } catch (err) {
        console.error('Stats error:', err);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, []);

  // Elapsed time counter
  useEffect(() => {
    let timer;
    if (processing) {
      setElapsedTime(0);
      timer = setInterval(() => setElapsedTime(p => p + 1), 1000);
    }
    return () => timer && clearInterval(timer);
  }, [processing]);

  // 🔥 ECG HEARTBEAT GENERATOR - Realistic medical monitor style
  useEffect(() => {
    let frameCount = 0;
    const interval = setInterval(() => {
      frameCount++;
      
      // Calculate heartbeat (60-90 BPM when processing, 65-75 when idle)
      const bpm = processing ? 75 + Math.sin(frameCount * 0.1) * 15 : 70 + Math.sin(frameCount * 0.05) * 5;
      setHeartbeat(Math.round(bpm));
      
      // 🌊 Update scanning wave position (moves continuously)
      setScanPosition(prev => (prev + 2) % 100);
      
      // Generate ECG waveform
      setEcgData(prev => {
        const newData = [...prev.slice(1)];
        
        // Create realistic ECG pattern
        const phase = frameCount % (processing ? 25 : 35); // Faster when processing
        let value = 50; // Baseline
        
        if (phase < 2) {
          // P wave (small bump)
          value = 50 + Math.sin(phase * Math.PI) * 8;
        } else if (phase >= 5 && phase < 9) {
          // QRS complex (sharp spike)
          if (phase === 6) value = 30; // Q dip
          else if (phase === 7) value = 95; // R peak (SPIKE!)
          else if (phase === 8) value = 20; // S dip
        } else if (phase >= 12 && phase < 18) {
          // T wave (rounded bump)
          value = 50 + Math.sin((phase - 12) / 6 * Math.PI) * 15;
        } else {
          // Isoelectric line with tiny noise
          value = 50 + (Math.random() - 0.5) * 2;
        }
        
        newData.push(value);
        return newData;
      });
      
      // Update CPU & Memory
      const cpu = processing ? 65 + Math.random() * 30 : 25 + Math.random() * 20;
      const mem = processing ? 55 + Math.random() * 30 : 42 + Math.random() * 18;
      setCpuUsage(cpu);
      setMemoryUsage(mem);
      
      // Update history graphs
      setCpuHistory(prev => [...prev.slice(1), cpu]);
      setMemoryHistory(prev => [...prev.slice(1), mem]);
      
      const throughput = processing ? 2 + Math.random() * 3 : 0;
      setThroughputHistory(prev => [...prev.slice(1), throughput]);
      
    }, 50); // 20 FPS for smooth animation
    
    return () => clearInterval(interval);
  }, [processing]);

  // Doc count
  useEffect(() => {
    if (processing) {
      setDocCount(1);
    } else if (results) {
      setDocCount(1);
    } else {
      setDocCount(0);
    }
  }, [processing, results]);

  if (!isVisible) return null;

  const estimate = estimatedTime || (() => {
    if (!file) return 0;
    const mb = file.size / (1024 * 1024);
    const ext = file.name.split('.').pop().toLowerCase();
    return ['pdf','xlsx','csv'].includes(ext) ? Math.ceil(mb*2) : Math.ceil(mb*5);
  })();

  const stats = results ? {
    confidence: results.best_result?.confidence_score || results.confidence_score || 0,
    processingTime: results.total_processing_time || results.processing_time || 0,
    textLength: results.best_result?.extracted_text?.length || results.extracted_text?.length || 0,
    engine: results.best_result?.engine_name || results.engine || 'unknown',
    cached: results.cached || false,
    rowsDetected: (() => {
      const text = results.best_result?.extracted_text || results.extracted_text || '';
      return text ? text.split('\n').filter(l => l.trim()).length : 0;
    })(),
    totalDocs: results.results?.length || 1
  } : null;

  const Card = ({children, style}) => (
    <div style={{background:"#f9fafb",borderRadius:"8px",padding:"12px",border:"1px solid #e5e7eb",...style}}>{children}</div>
  );

  const StatBox = ({label, value, color="#1f2937"}) => (
    <div style={{background:"#f9fafb",borderRadius:"6px",padding:"10px",border:"1px solid #e5e7eb"}}>
      <p style={{fontSize:"8px",color:"#64748b",margin:"0 0 4px 0",fontWeight:"600"}}>{label}</p>
      <p style={{fontSize:"12px",fontWeight:"700",margin:0,color}}>{value}</p>
    </div>
  );

  const MiniGraph = ({data, color, height = 40, showGrid = true}) => (
    <div style={{height:`${height}px`,background:"#020617",borderRadius:"4px",padding:"4px",position:"relative",overflow:"hidden",border:"1px solid #1e293b"}}>
      {showGrid && (
        <>
          {[0,1,2,3].map(i => (
            <div key={i} style={{position:"absolute",top:`${i*25}%`,left:0,right:0,height:"1px",background:"#1e293b",opacity:0.5}}/>
          ))}
        </>
      )}
      <svg width="100%" height="100%" style={{display:"block"}}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={data.map((v, i) => `${(i / (data.length - 1)) * 100}%,${100 - v}%`).join(" ")}
          style={{filter:"drop-shadow(0 0 4px currentColor)"}}
        />
      </svg>
    </div>
  );

  const EmptyState = ({icon: Icon, title, subtitle}) => (
    <div style={{textAlign:"center",padding:"60px 20px",color:"#94a3b8"}}>
      <Icon size={48} style={{margin:"0 auto 16px",opacity:0.5}}/>
      <h3 style={{fontSize:"14px",fontWeight:"600",margin:"0 0 8px 0",color:"#64748b"}}>{title}</h3>
      <p style={{fontSize:"11px",margin:0}}>{subtitle}</p>
    </div>
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        overflow: "hidden"
      }}
    >
      {/* 🔥 ECG MONITOR HEADER - Medical style */}
      <div style={{background:"linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",padding:"16px 16px 12px 16px",borderBottom:"2px solid #334155",boxShadow:"0 4px 12px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <Heart size={20} style={{color:"#ef4444",filter:"drop-shadow(0 0 6px #ef4444)"}}/>
            <h3 style={{fontSize:"13px",fontWeight:"700",margin:0,color:"#f1f5f9",letterSpacing:"0.5px"}}>
              LIVE MONITOR
            </h3>
          </div>
          <div style={{fontSize:"8px",color:"#64748b",fontWeight:"600",letterSpacing:"0.5px"}}>
            OCR SYSTEM
          </div>
        </div>

        {/* 🔥 ECG WAVEFORM DISPLAY */}
        <div style={{position:"relative",height:"80px",background:"#020617",borderRadius:"6px",padding:"8px",border:"2px solid #1e293b",boxShadow:"inset 0 2px 8px rgba(0,0,0,0.5)"}}>
          {/* Grid Lines */}
          {[0,1,2,3,4].map(i => (
            <div key={`h${i}`} style={{position:"absolute",top:`${i*20}%`,left:"8px",right:"8px",height:"1px",background:"#1e293b",opacity:0.6,zIndex:1}}/>
          ))}
          {Array.from({length:20}).map((_, i) => (
            <div key={`v${i}`} style={{position:"absolute",top:"8px",bottom:"8px",left:`${(i/19)*100}%`,width:"1px",background:"#1e293b",opacity:0.4,zIndex:1}}/>
          ))}
          
          {/* 🌊 Scanning Wave Effect */}
          <div style={{
            position:"absolute",
            left:`${scanPosition}%`,
            top:"8px",
            bottom:"8px",
            width:"2px",
            background:"linear-gradient(to bottom, transparent, #22c55e, transparent)",
            boxShadow:"0 0 10px #22c55e",
            zIndex:5,
            opacity:0.8
          }}/>
          
          {/* ECG Waveform */}
          <svg width="100%" height="100%" style={{position:"absolute",top:0,left:0,zIndex:3}}>
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              points={ecgData.map((v, i) => `${(i / (ecgData.length - 1)) * 100}%,${v}%`).join(" ")}
              style={{filter:"url(#glow)"}}
            />
          </svg>
          
          {/* BPM Display */}
          <div style={{position:"absolute",top:"8px",left:"8px",background:"rgba(0,0,0,0.7)",padding:"4px 8px",borderRadius:"4px",border:"1px solid #ef4444",zIndex:6}}>
            <div style={{fontSize:"8px",color:"#94a3b8",marginBottom:"2px"}}>HEART RATE</div>
            <div style={{fontSize:"16px",fontWeight:"700",color:"#ef4444",textShadow:"0 0 8px #ef4444"}}>
              {Math.round(heartbeat)}
            </div>
            <div style={{fontSize:"7px",color:"#94a3b8"}}>BPM</div>
          </div>
          
          {/* Status Indicator */}
          <div style={{position:"absolute",top:"8px",right:"8px",background:"rgba(0,0,0,0.7)",padding:"4px 8px",borderRadius:"4px",border:"1px solid #22c55e",zIndex:6}}>
            <div style={{fontSize:"8px",color:"#22c55e",fontWeight:"700"}}>
              {processing ? "ACTIVE" : "STABLE"}
            </div>
          </div>
        </div>

        {/* System Stats Row */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginTop:"8px"}}>
          {[
            {l:"BPM",v:Math.round(heartbeat),c:"#ef4444"},
            {l:"CPU",v:Math.round(cpuUsage)+'%',c:"#3b82f6"},
            {l:"RAM",v:Math.round(memoryUsage)+'%',c:"#8b5cf6"}
          ].map((s,i)=>
            <div key={i} style={{background:"#1e293b",borderRadius:"4px",padding:"6px",textAlign:"center"}}>
              <div style={{fontSize:"8px",color:"#64748b",marginBottom:"2px"}}>{s.l}</div>
              <div style={{fontSize:"14px",fontWeight:"700",color:s.c}}>{s.v}</div>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div style={{flex:1,overflow:"auto",padding:"16px"}}>
        
        {/* Processing Status */}
        {processing && (
          <Card style={{background:"linear-gradient(135deg, #667eea 0%, #764ba2 100%)",color:"white",marginBottom:"16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px"}}>
              <Clock size={20}/>
              <h4 style={{margin:0,fontSize:"12px",fontWeight:"700"}}>Processing Doc {docCount}...</h4>
            </div>
            <div style={{marginBottom:"12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",marginBottom:"4px"}}>
                <span>Elapsed: {elapsedTime}s</span>
                <span>Est: ~{estimate}s</span>
              </div>
              <div style={{height:"6px",background:"rgba(255,255,255,0.3)",borderRadius:"3px",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min((elapsedTime/estimate)*100,100)}%`,background:"white",transition:"width 1s linear",borderRadius:"3px"}}/>
              </div>
            </div>
            <p style={{fontSize:"9px",margin:0,opacity:0.9}}>⚡ Running multi-engine OCR</p>
          </Card>
        )}
        
        {/* Live Performance Graphs */}
        {(processing || stats) && (
          <div style={{marginBottom:"16px"}}>
            <h4 style={{fontSize:"11px",fontWeight:"700",marginBottom:"12px",color:"#1f2937",display:"flex",alignItems:"center",gap:"6px"}}>
              <TrendingUp size={14} style={{color:"#3b82f6"}}/>
              Live Performance
            </h4>
            
            <Card style={{marginBottom:"10px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"6px"}}>
                <Activity size={12} style={{color:"#3b82f6"}}/>
                <p style={{fontSize:"9px",fontWeight:"600",margin:0,color:"#64748b"}}>CPU Usage</p>
                <span style={{fontSize:"10px",fontWeight:"700",marginLeft:"auto",color:"#3b82f6"}}>
                  {Math.round(cpuUsage)}%
                </span>
              </div>
              <MiniGraph data={cpuHistory} color="#3b82f6" height={35}/>
            </Card>

            <Card style={{marginBottom:"10px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"6px"}}>
                <Database size={12} style={{color:"#8b5cf6"}}/>
                <p style={{fontSize:"9px",fontWeight:"600",margin:0,color:"#64748b"}}>Memory Usage</p>
                <span style={{fontSize:"10px",fontWeight:"700",marginLeft:"auto",color:"#8b5cf6"}}>
                  {Math.round(memoryUsage)}%
                </span>
              </div>
              <MiniGraph data={memoryHistory} color="#8b5cf6" height={35}/>
            </Card>

            {processing && (
              <Card>
                <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"6px"}}>
                  <Activity size={12} style={{color:"#10b981"}}/>
                  <p style={{fontSize:"9px",fontWeight:"600",margin:0,color:"#64748b"}}>Throughput</p>
                  <span style={{fontSize:"10px",fontWeight:"700",marginLeft:"auto",color:"#10b981"}}>
                    {throughputHistory[throughputHistory.length-1].toFixed(1)} pages/s
                  </span>
                </div>
                <MiniGraph data={throughputHistory.map(v=>v*20)} color="#10b981" height={35}/>
              </Card>
            )}
          </div>
        )}
        
        {/* Document Info */}
        {file && (
          <Card style={{marginBottom:"16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px"}}>
              <FileText size={16} style={{color:"#3b82f6"}}/>
              <h4 style={{margin:0,fontSize:"11px",fontWeight:"700",color:"#1f2937"}}>Document Info</h4>
            </div>
            <div style={{fontSize:"9px",color:"#64748b",lineHeight:"1.6"}}>
              <div><strong>Name:</strong> {file.name}</div>
              <div><strong>Size:</strong> {(file.size/1024).toFixed(1)} KB</div>
              <div><strong>Type:</strong> {file.type||'Unknown'}</div>
            </div>
          </Card>
        )}
        
        {/* Extraction Results */}
        {stats && (
          <>
            <h4 style={{fontSize:"11px",fontWeight:"700",marginBottom:"12px",color:"#1f2937"}}>Extraction Results</h4>
            <Card style={{background:stats.confidence>=80?"#d1fae5":stats.confidence>=60?"#fef3c7":"#fee2e2",border:`1px solid ${stats.confidence>=80?"#86efac":stats.confidence>=60?"#fde047":"#fca5a5"}`,marginBottom:"12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <p style={{fontSize:"9px",margin:"0 0 4px 0",color:"#64748b",fontWeight:"600"}}>Confidence</p>
                  <p style={{fontSize:"20px",fontWeight:"700",margin:0,color:"#1f2937"}}>{stats.confidence.toFixed(1)}%</p>
                </div>
                {stats.confidence>=80?<CheckCircle size={32} style={{color:"#059669"}}/>:<AlertCircle size={32} style={{color:stats.confidence>=60?"#f59e0b":"#ef4444"}}/>}
              </div>
            </Card>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"16px"}}>
              <StatBox label="Time" value={`${stats.processingTime.toFixed(2)}s`}/>
              <StatBox label="Characters" value={stats.textLength.toLocaleString()}/>
              <StatBox label="Lines" value={stats.rowsDetected}/>
              <StatBox label="Documents" value={stats.totalDocs}/>
              <StatBox label="Engine" value={stats.engine.toUpperCase()}/>
              <StatBox label="Cache" value={stats.cached?"HIT":"NEW"}/>
            </div>
          </>
        )}

        {/* System Stats */}
        {backendStats && (
          <>
            <h4 style={{fontSize:"11px",fontWeight:"700",marginBottom:"12px",color:"#1f2937"}}>System Stats</h4>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"12px"}}>
              <StatBox label="Total" value={backendStats.total_documents||0} color="#3b82f6"/>
              <StatBox label="Completed" value={backendStats.completed||0} color="#10b981"/>
              <StatBox label="Processing" value={backendStats.processing||0} color="#f59e0b"/>
              <StatBox label="Failed" value={backendStats.failed||0} color="#ef4444"/>
            </div>
            <Card>
              <p style={{fontSize:"8px",color:"#64748b",marginBottom:"6px",fontWeight:"600"}}>ENGINES</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                {backendStats.available_engines && Object.entries(backendStats.available_engines).map(([e, a]) => (
                  <span key={e} style={{fontSize:"8px",padding:"3px 8px",borderRadius:"12px",background:a?"#d1fae5":"#fee2e2",color:a?"#065f46":"#991b1b",fontWeight:"600"}}>
                    {e.toUpperCase()}: {a?"✓":"✗"}
                  </span>
                ))}
              </div>
            </Card>
          </>
        )}
        
        {!processing&&!stats&&!file&&!backendStats&&<EmptyState icon={Eye} title="No Activity" subtitle="Upload a document to start"/>}
      </div>
    </div>
  );
}
