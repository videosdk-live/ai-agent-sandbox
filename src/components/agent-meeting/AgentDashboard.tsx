import React, { useState, useEffect, useRef } from "react";
import { usePubSub, useMeeting, useParticipant } from "@videosdk.live/react-sdk";
import { AgentVideoPlayer } from "./AgentVideoPlayer";

interface EventLog {
    timestamp: string;
    event: string;
    data?: any;
}

interface Transcript {
    role: string;
    text: string;
    id: string;
    uid: string; // Stable ID for React keys
    isPartial?: boolean;
    timestamp: number;
}

interface AgentDashboardProps {
    onConnect: () => void;
    onDisconnect: () => void;
    isJoined: boolean;
    agentParticipantId?: string;
    webcamOn?: boolean;
}

// Simple SVG Line Chart Component for Timeline Graph
const MetricGraph: React.FC<{ data: any[]; pipelineType: string | null }> = ({ data, pipelineType }) => {

    if (!data || data.length === 0) return <div className="graph-placeholder">Waiting for data...</div>;

    const width = 300;
    const height = 150;
    const padding = 30;

    // Different metrics for different pipeline types
    const getMetrics = (d: any) => {
        if (pipelineType === "realtime") {
            return {
                metric1: d.ttfb || 0,
                metric2: d.e2e_latency || 0,
                metric3: d.thinking_delay || 0
            };
        } else {
            return {
                metric1: d.stt_latency || 0,
                metric2: d.llm_ttft || 0,
                metric3: d.tts_latency || 0
            };
        }
    };

    const maxVal = Math.max(...data.map(d => {
        const m = getMetrics(d);
        return Math.max(m.metric1, m.metric2, m.metric3);
    }), 1000);

    const getX = (i: number) => padding + (i / (Math.max(data.length - 1, 1))) * (width - 2 * padding);
    const getY = (val: number) => height - padding - ((val || 0) / maxVal) * (height - 2 * padding);

    const makePath = (metricKey: string) => {
        return data.map((d, i) => {
            const metrics = getMetrics(d);
            const val = metrics[metricKey as keyof typeof metrics];
            return `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`;
        }).join(' ');
    };

    return (
        <div className="metric-graph">
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
                {/* Grid Lines & Y-Axis Labels */}
                {[0, 0.5, 1].map(t => {
                    const val = Math.round(maxVal * t);
                    const y = getY(val);
                    return (
                        <g key={t}>
                            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#333" strokeWidth="1" strokeDasharray="4 4" />
                            <text x={padding - 5} y={y + 3} fill="#666" fontSize="10" textAnchor="end">
                                {(val / 1000).toFixed(1)}s
                            </text>
                        </g>
                    );
                })}

                {/* X-Axis Labels */}
                <text x={padding} y={height - 5} fill="#666" fontSize="10" textAnchor="middle">Start</text>
                <text x={width - padding} y={height - 5} fill="#666" fontSize="10" textAnchor="middle">Now</text>

                {/* Paths */}
                <path d={makePath('metric1')} fill="none" stroke="#60a5fa" strokeWidth="2" />
                <path d={makePath('metric2')} fill="none" stroke="#f87171" strokeWidth="2" />
                <path d={makePath('metric3')} fill="none" stroke="#34d399" strokeWidth="2" />

                {/* Interruption Lines */}
                {data.map((d, i) => (
                    d.interrupted && (
                        <line
                            key={i}
                            x1={getX(i)}
                            y1={padding}
                            x2={getX(i)}
                            y2={height - padding}
                            stroke="#fbbf24"
                            strokeWidth="1"
                            strokeDasharray="4 2"
                            opacity="0.5"
                        />
                    )
                ))}
            </svg>
            <div className="graph-legend">
                {pipelineType === "realtime" ? (
                    <>
                        <span style={{ color: "#3b82f6" }}>● TTFB</span>
                        <span style={{ color: "#ef4444" }}>● E2E Latency</span>
                        <span style={{ color: "#10b981" }}>● Thinking</span>
                    </>
                ) : (
                    <>
                        <span style={{ color: "#3b82f6" }}>● STT</span>
                        <span style={{ color: "#ef4444" }}>● LLM</span>
                        <span style={{ color: "#10b981" }}>● TTS</span>
                    </>
                )}
            </div>
        </div>
    );
};

// Helper to get metrics configuration based on pipeline type
const getMetricsConfig = (pipelineType: string | null) => {
    if (!pipelineType) return [];
    if (pipelineType === "realtime") {
        return [
            { key: 'ttfb', label: 'TTFB', color: '#1d4ed8', borderColor: '#60a5fa' },
            { key: 'e2e_latency', label: 'E2E', color: '#b91c1c', borderColor: '#f87171' }
        ];
    }
    return [
        { key: 'stt_latency', label: 'STT', color: '#1d4ed8', borderColor: '#60a5fa' },
        { key: 'llm_ttft', label: 'LLM', color: '#b91c1c', borderColor: '#f87171' },
        { key: 'ttfb', label: 'TTS', color: '#047857', borderColor: '#34d399' },
        { key: 'e2e_latency', label: 'E2E', color: '#c2410c', borderColor: '#fbbf24' }
    ];
};

// Vertical Bar Chart Component for Latency History
const LatencyBarChart: React.FC<{ history: any[]; pipelineType: string | null }> = ({ history, pipelineType }) => {
    if (!history || history.length === 0 || !pipelineType) {
        return (
            <div className="empty-state-modern">
                <Activity size={48} className="icon" />
                <p>Waiting for latency data...</p>
            </div>
        );
    }

    const metrics = getMetricsConfig(pipelineType);

    // Find max value across all data points for scaling
    const maxValue = Math.max(
        ...history.flatMap(d => metrics.map(m => d[m.key] || 0)),
        1000
    );

    // Generate y-axis labels (in seconds)
    const yAxisSteps = 4;
    const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
        const value = (maxValue / yAxisSteps) * (yAxisSteps - i);
        return (value / 1000).toFixed(1);
    });

    return (
        <div className="vertical-bar-chart">
            <div className="bar-chart-main">
                {/* Y-axis labels */}
                <div className="y-axis">
                    {yAxisLabels.map((label, idx) => (
                        <div key={idx} className="y-axis-label">
                            {label}s
                        </div>
                    ))}
                </div>

                {/* Chart area with bars */}
                <div className="chart-area">
                    {/* Grid lines */}
                    <div className="grid-lines">
                        {yAxisLabels.map((_, idx) => (
                            <div key={idx} className="grid-line" />
                        ))}
                    </div>

                    {/* Bars container */}
                    <div className="bar-chart-container">
                        {history.map((dataPoint, turnIdx) => (
                            <div key={turnIdx} className="turn-group">
                                <div className="bar-group">
                                    {metrics.map((metric, metricIdx) => {
                                        const value = dataPoint[metric.key] || 0;
                                        const heightPercent = (value / maxValue) * 100;

                                        return (
                                            <div key={metricIdx} className="bar-wrapper">
                                                <div
                                                    className="vertical-bar"
                                                    style={{
                                                        height: `${heightPercent}%`,
                                                        background: metric.color,
                                                        border: `1px solid ${metric.borderColor}`,
                                                        borderBottom: 'none'
                                                    }}
                                                    title={`Turn ${turnIdx + 1} - ${metric.label}: ${(value / 1000).toFixed(2)}s`}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="turn-label">Turn {turnIdx + 1}</div>
                            </div>
                        ))}
                    </div>

                    {/* X-axis baseline */}
                    <div className="x-axis-baseline" />
                </div>
            </div>


        </div>
    );
};



// Icons
const Zap: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

const MessageSquare: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);

const Activity: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);

const BarChart: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="20" x2="12" y2="10" />
        <line x1="18" y1="20" x2="18" y2="4" />
        <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
);

const MicOff: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
);

const Mic: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
);

const Info: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
);

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
    onConnect,
    onDisconnect,
    isJoined,
    agentParticipantId,
    webcamOn
}) => {
    const [status, setStatus] = useState<string>("offline");
    const [metrics, setMetrics] = useState<any>(null);
    const [pipelineType, setPipelineType] = useState<string | null>(null);
    const [metricsHistory, setMetricsHistory] = useState<any[]>([]);
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const [events, setEvents] = useState<EventLog[]>([]);
    const lastFullTurnRef = useRef<boolean>(false);
    const greetingShownRef = useRef<boolean>(false);
    const lastEventTimeRef = useRef<number>(0);

    // Helper function to sort transcripts by timestamp
    const sortTranscripts = (transcripts: Transcript[]) => {
        return transcripts.sort((a, b) => a.timestamp - b.timestamp);
    };


    const { localParticipant, participants, toggleMic } = useMeeting();

    // Find agent participant
    const participantsList = Array.from(participants.values());
    const agentParticipant = participantsList.find(
        (p) => p.displayName?.includes("Agent") || p.displayName?.includes("Haley")
    );

    // Get speaking status
    const { isActiveSpeaker: isAgentSpeaking } = useParticipant(agentParticipant?.id || "");
    const { isActiveSpeaker: isUserSpeaking, micOn: isMicOn } = useParticipant(localParticipant?.id || "");

    // Heuristic State Machine
    useEffect(() => {
        if (!isJoined) {
            setStatus("offline");
            setMetricsHistory([]);
            return;
        }

        if (isAgentSpeaking) {
            setStatus("speaking");
        } else if (isUserSpeaking) {
            setStatus("listening");
        } else {
            setStatus((prev) => {
                if (prev === "listening") return "thinking";
                if (prev === "speaking") return "listening";
                return prev === "offline" ? "listening" : prev;
            });
        }
    }, [isAgentSpeaking, isUserSpeaking, isJoined]);

    const transcriptEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [transcripts]);

    const addEvent = (event: string, data?: any) => {
        const newEvent = {
            timestamp: new Date().toLocaleTimeString([], { hour12: false }),
            event,
            data
        };
        setEvents(prev => [...prev, newEvent].slice(-50));
    };

    usePubSub("AGENT_METRICS", {
        onMessageReceived: (message) => {
            try {
                // Handle both string and object inputs
                const payload = typeof message.message === 'string'
                    ? JSON.parse(message.message)
                    : message.message;



                // Check if it's the new format with type and metrics fields
                if (payload.type && payload.metrics) {
                    const type = payload.type; // "realtime" or "cascading"
                    const fullTurnData = payload.full_turn_data || false;

                    // Parse the stringified metrics
                    const metricsData = typeof payload.metrics === 'string'
                        ? JSON.parse(payload.metrics)
                        : payload.metrics;


                    // Set pipeline type
                    setPipelineType(type);



                    // Update current metrics for real-time display
                    // Merge if it's partial data, otherwise replace if full turn
                    setMetrics((prev: any) => {
                        if (fullTurnData) {
                            lastFullTurnRef.current = true;
                            return metricsData;
                        }

                        const isNewTurn = lastFullTurnRef.current;
                        lastFullTurnRef.current = false;

                        // If it's a new turn, start with an empty object but preserve provider/model info
                        let base = (prev || {});
                        if (isNewTurn) {
                            const preserved: any = {};
                            const keysToPreserve = [
                                'provider_class_name', 'provider_model_name',
                                'stt_provider_class', 'stt_model_name',
                                'llm_provider_class', 'llm_model_name',
                                'tts_provider_class', 'tts_model_name'
                            ];
                            keysToPreserve.forEach(key => {
                                if (base[key]) preserved[key] = base[key];
                            });
                            base = preserved;
                        }

                        // Merge only non-null values
                        const updates: any = {};
                        Object.keys(metricsData).forEach(key => {
                            if (metricsData[key] !== null && metricsData[key] !== undefined) {
                                updates[key] = metricsData[key];
                            }
                        });

                        return { ...base, ...updates };
                    });

                    // Only update history (for graph) when full_turn_data is true
                    if (fullTurnData) {
                        setMetricsHistory((prev: any[]) => [...prev, metricsData].slice(-20));

                        addEvent("fullTurnComplete", { type });
                    }

                    // Handle user_speech field for immediate display
                    // Only process if there's no timeline data (to avoid redundant updates)
                    if (metricsData.user_speech && typeof metricsData.user_speech === 'string' &&
                        (!metricsData.timeline || !Array.isArray(metricsData.timeline) || metricsData.timeline.length === 0)) {

                        const userText = metricsData.user_speech;
                        setTranscripts(prev => {
                            // Check if there's already a partial user message (interim result)
                            const lastUserIndex = [...prev].reverse().findIndex(t => t.role === 'user');
                            const actualIndex = lastUserIndex >= 0 ? prev.length - 1 - lastUserIndex : -1;

                            if (actualIndex >= 0 && prev[actualIndex].isPartial) {
                                const prevText = prev[actualIndex].text;
                                // Check if this is a continuation (new text is longer and contains previous)
                                // or a new segment (completely different text)
                                const isContinuation = userText.length > prevText.length && userText.includes(prevText);

                                if (isContinuation) {
                                    // Update the existing partial user message (continuous speech)

                                    const newTranscripts = [...prev];
                                    newTranscripts[actualIndex] = {
                                        ...newTranscripts[actualIndex],
                                        text: userText
                                    };
                                    return sortTranscripts(newTranscripts);
                                } else {
                                    // New segment after pause - finalize previous and add new

                                    const newTranscripts = [...prev];
                                    newTranscripts[actualIndex] = {
                                        ...newTranscripts[actualIndex],
                                        isPartial: false // Finalize the previous segment
                                    };
                                    const tempId = `temp-user-${Date.now()}`;
                                    const updated = [...newTranscripts, {
                                        role: "user" as const,
                                        text: userText,
                                        id: tempId,
                                        uid: `uid-${Date.now()}-${Math.random()}`,
                                        isPartial: true,
                                        timestamp: lastEventTimeRef.current + 0.01
                                    }];
                                    return sortTranscripts(updated).slice(-50);
                                }
                            } else {
                                // Add new user message if no partial exists
                                const existingIndex = prev.findIndex(t => t.text === userText);
                                if (existingIndex === -1) {

                                    const tempId = `temp-user-${Date.now()}`;
                                    const updated = [...prev, {
                                        role: "user" as const,
                                        text: userText,
                                        id: tempId,
                                        uid: `uid-${Date.now()}-${Math.random()}`,
                                        isPartial: true,
                                        timestamp: lastEventTimeRef.current + 0.01
                                    }];
                                    return sortTranscripts(updated).slice(-50);
                                }
                                return prev;
                            }
                        });
                    }

                    // Handle agent_speech field directly (for initial greeting)
                    // Only process if there's no timeline data (to avoid duplicates)
                    if (metricsData.agent_speech && typeof metricsData.agent_speech === 'string' &&
                        (!metricsData.timeline || !Array.isArray(metricsData.timeline) || metricsData.timeline.length === 0)) {

                        const agentText = metricsData.agent_speech;

                        // Only add as greeting if this is the first agent message
                        if (!greetingShownRef.current) {
                            const greetingId = `greeting-${agentText}`;

                            setTranscripts(prev => {
                                // Check if this greeting already exists
                                const existingIndex = prev.findIndex(t => t.id === greetingId || t.text === agentText);

                                if (existingIndex === -1) {
                                    greetingShownRef.current = true;
                                    const updated = [...prev, {
                                        role: "agent" as const,
                                        text: agentText,
                                        id: greetingId,
                                        uid: `uid-${Date.now()}-${Math.random()}`,
                                        isPartial: false,
                                        timestamp: 0 // Greeting always first
                                    }];
                                    return sortTranscripts(updated).slice(-50);
                                }
                                return prev;
                            });
                        } else {
                            // For non-greeting agent messages, add them immediately with temp ID
                            setTranscripts(prev => {
                                const tempId = `temp-agent-${Date.now()}`;
                                const existingIndex = prev.findIndex(t => t.text === agentText);

                                if (existingIndex === -1) {

                                    const updated = [...prev, {
                                        role: "agent",
                                        text: agentText,
                                        id: tempId,
                                        uid: `uid-${Date.now()}-${Math.random()}`,
                                        isPartial: true,
                                        timestamp: lastEventTimeRef.current + 0.02
                                    }];
                                    return sortTranscripts(updated).slice(-50);
                                }
                                return prev;
                            });
                        }
                    }

                    // Update transcripts from timeline if available
                    if (metricsData.timeline && Array.isArray(metricsData.timeline)) {

                        metricsData.timeline.forEach((event: any) => {
                            if (event.event_type && event.text) {
                                // Update last known event time
                                const eventTime = event.end_time || event.start_time;
                                if (eventTime && typeof eventTime === 'number') {
                                    lastEventTimeRef.current = Math.max(lastEventTimeRef.current, eventTime);
                                }


                                const role = event.event_type === "user_speech" ? "user" : "agent";
                                setTranscripts(prev => {
                                    const id = `${event.start_time}-${role}`;
                                    const existingIndex = prev.findIndex(t => t.id === id || t.text === event.text);

                                    if (existingIndex !== -1) {
                                        // Update existing item if:
                                        // 1. It has a temp ID (needs to be finalized with timeline ID)
                                        // 2. Text changed
                                        // 3. End time is available and it was partial
                                        if (prev[existingIndex].id.startsWith('temp-') || prev[existingIndex].text !== event.text || (event.end_time && prev[existingIndex].isPartial)) {
                                            const newTranscripts = [...prev];
                                            newTranscripts[existingIndex] = {
                                                ...newTranscripts[existingIndex],
                                                text: event.text,
                                                isPartial: !event.end_time,
                                                id,  // Update to timeline ID
                                                timestamp: event.start_time // Update to accurate timeline timestamp
                                            };

                                            return sortTranscripts(newTranscripts);
                                        }

                                        return prev;
                                    }

                                    const newTranscript = {
                                        role,
                                        text: event.text,
                                        id,
                                        uid: `uid-${Date.now()}-${Math.random()}`,
                                        isPartial: !event.end_time,
                                        timestamp: event.start_time
                                    };

                                    const updated = [...prev, newTranscript];
                                    return sortTranscripts(updated).slice(-50);
                                });
                            }
                        });
                    }

                } else if (payload.type === "PERFORMANCE") {
                    // Legacy format support
                    let metricsData = payload.data;

                    // Detect pipeline type from legacy format
                    if (metricsData && metricsData.type === "RealtimeInteraction") {
                        setPipelineType("realtime");
                    } else if (metricsData && metricsData.type === "CascadingInteraction") {
                        setPipelineType("cascading");
                    }

                    if (metricsData && metricsData.data && Array.isArray(metricsData.data)) {
                        metricsData = metricsData.data[0];
                    }
                    setMetrics(metricsData);
                    setMetricsHistory(prev => [...prev, metricsData].slice(-20));
                    addEvent("performanceMetricsReceived");
                } else if (payload.type === "EVENT") {
                    const { event, data } = payload;
                    addEvent(event, data);

                    if (event === "transcript") {
                        setTranscripts(prev => {
                            const role = data.role === "user" ? "user" : "agent";
                            const newMsg = {
                                role,
                                text: data.text,
                                id: `${Date.now()}-${role}`,
                                uid: `uid-${Date.now()}-${Math.random()}`,
                                isPartial: false,
                                timestamp: lastEventTimeRef.current + 0.01
                            };
                            return sortTranscripts([...prev, newMsg]).slice(-50);
                        });
                    }
                }
            } catch (e) {
                console.error("Error parsing AGENT_METRICS message", e);
            }
        },
    });

    // Format helper
    const formatValue = (value: any, unit: string = "ms") => {
        if (value === null || value === undefined) return "-";
        if (unit === "ms") {
            return `${(value / 1000).toFixed(2)}s`;
        }
        return String(value);
    };

    // Render key-value pairs based on pipeline type
    const renderMetricsInfo = () => {
        if (!metrics || !pipelineType) {
            return (
                <div className="empty-state-modern">
                    <Info size={32} className="icon" />
                    <p style={{ fontSize: "0.8rem", marginTop: "8px" }}>No metrics data</p>
                </div>
            );
        }

        const rows = pipelineType === "realtime"
            ? [
                { label: "Provider", value: metrics.provider_class_name || "-" },
                { label: "Model", value: metrics.provider_model_name || "-" },
                { label: "TTFB", value: formatValue(metrics.ttfb) },
                { label: "Thinking Delay", value: formatValue(metrics.thinking_delay) },
                { label: "E2E Latency", value: formatValue(metrics.e2e_latency) },
                { label: "Interrupted", value: metrics.interrupted ? "Yes" : "No" },
                { label: "A2A Enabled", value: metrics.is_a2a_enabled ? "Yes" : "No" },
                { label: "Handoff", value: metrics.handoff_occurred ? "Yes" : "No" }
            ]
            : [
                { label: "STT", value: `${metrics.stt_provider_class || "-"} / ${metrics.stt_model_name || "-"}` },
                { label: "LLM", value: `${metrics.llm_provider_class || "-"} / ${metrics.llm_model_name || "-"}` },
                { label: "TTS", value: `${metrics.tts_provider_class || "-"} / ${metrics.tts_model_name || "-"}` },
                { label: "STT Latency", value: formatValue(metrics.stt_latency) },
                { label: "LLM Latency", value: formatValue(metrics.llm_ttft) },
                { label: "TTS Latency", value: formatValue(metrics.tts_latency) },
                { label: "E2E Latency", value: formatValue(metrics.e2e_latency) },
                { label: "EOU Latency", value: formatValue(metrics.eou_latency) },
                { label: "LLM Duration", value: formatValue(metrics.llm_duration) },
                { label: "TTS Characters", value: metrics.tts_characters || "-" },
                { label: "Total Tokens", value: metrics.total_tokens || "-" },
                { label: "Interrupted", value: metrics.interrupted ? "Yes" : "No" }
            ];

        return (
            <div className="metrics-info-grid">
                {rows.map((row, idx) => (
                    <div key={idx} className="metric-info-row">
                        <span className="metric-info-label">{row.label}</span>
                        <span className={`metric-info-value ${row.value === "-" ? "null" : ""}`}>
                            {row.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="command-center">
            {/* Header */}
            <div className="cc-header">
                <div className="cc-title">
                    <h1>Agent Playground</h1>
                </div>
                <div className="cc-status">
                    <div className={`status-badge ${status}`}>
                        <span className="status-dot"></span>
                        {status.toUpperCase()}
                    </div>
                    {isJoined && (
                        <button className={`cc-icon-btn ${!isMicOn ? 'muted' : ''}`} onClick={() => toggleMic()}>
                            {!isMicOn ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                    )}
                    {!isJoined ? (
                        <button className="cc-connect-btn" onClick={onConnect}>
                            Connect Agent
                        </button>
                    ) : (
                        <button className="cc-disconnect-btn" onClick={onDisconnect}>
                            DISCONNECT
                        </button>
                    )}
                </div>
            </div>

            {/* Main Grid */}
            <div className="cc-grid">
                {/* Left Column: Conversation & Latency Bars */}
                <div className="cc-left-column">
                    <div className="cc-panel conversation-panel">
                        <div className="panel-header">
                            <div className="header-left">
                                <MessageSquare size={14} />
                                <span>LIVE TRANSCRIPT</span>
                            </div>
                        </div>
                        <div className="chat-area">
                            {transcripts.length === 0 ? (
                                <div className="empty-state-modern">
                                    <MessageSquare size={48} className="icon" />
                                    <p>System Ready. Waiting for input...</p>
                                </div>
                            ) : (
                                transcripts.map((t) => (
                                    <div key={t.uid} className={`chat-row ${t.role}`}>
                                        <span className="role-label">{t.role === "user" ? "User" : "Agent"}</span>
                                        <div className="message-bubble">
                                            {t.text}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={transcriptEndRef} />
                        </div>
                    </div>

                    <div className="cc-panel latency-bars-panel">
                        <div className="panel-header">
                            <div className="header-left">
                                <BarChart size={14} />
                                <span>LATENCY HISTORY</span>
                            </div>
                            <div className="bar-chart-legend header-legend">
                                {getMetricsConfig(pipelineType).map((metric, idx) => (
                                    <div key={idx} className="legend-item">
                                        <div className="legend-pill" style={{
                                            background: metric.color,
                                            border: `1px solid ${metric.borderColor}`
                                        }} />
                                        <span className="legend-label">{metric.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="latency-bars-content">
                            <LatencyBarChart history={metricsHistory} pipelineType={pipelineType} />
                        </div>
                    </div>
                </div>

                {/* Right Column: Telemetry */}
                <div className="cc-right-column">
                    {/* Agent Visualizer */}
                    <div className="cc-panel visualizer-panel">
                        <div className="panel-header">
                            <div className="header-left">
                                <Activity size={14} />
                                <span>AGENT FEED</span>
                            </div>
                        </div>
                        <div className="visualizer-content">
                            {webcamOn && agentParticipantId ? (
                                <AgentVideoPlayer participantId={agentParticipantId} className="dashboard-video" />
                            ) : (
                                <div className={`agent-orb ${status}`}>
                                    <div className="orb-core" />
                                    <div className="wave-lines">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className="wave-line" />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Metrics Info Panel */}
                    <div className="cc-panel metrics-info-panel">
                        <div className="panel-header">
                            <Info size={14} />
                            <span>METRICS INFO</span>
                        </div>
                        <div className="metrics-info-content">
                            {renderMetricsInfo()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
