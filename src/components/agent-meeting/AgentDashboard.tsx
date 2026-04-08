import React, { useState, useEffect, useRef } from "react";
import { useMeeting, useParticipant } from "@videosdk.live/react-sdk";
import { AgentVideoPlayer } from "./AgentVideoPlayer";

interface Transcript {
    role: string;
    text: string;
    id: string;
    uid: string;
    participantName?: string;
    timestamp: number;
}

interface AgentDashboardProps {
    onConnect: () => void;
    onDisconnect: () => void;
    isJoined: boolean;
    agentParticipantId?: string;
    webcamOn?: boolean;
    agentState?: string;
    latestMetrics?: any;
    latestTranscription?: any;
}

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
        { key: 'ttfb', label: 'TTFB', color: '#047857', borderColor: '#34d399' },
        { key: 'eou_latency', label: 'EOU', color: '#7c3aed', borderColor: '#a78bfa' },
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

    const dataMax = Math.max(
        ...history.flatMap(d => metrics.map(m => d[m.key] || 0)),
        1
    );
    const maxValue = dataMax * 1.2;

    const yAxisSteps = 4;
    const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
        const value = (maxValue / yAxisSteps) * (yAxisSteps - i);
        if (maxValue >= 1000) {
            return `${(value / 1000).toFixed(1)}s`;
        }
        if (maxValue < 10) {
            return `${value.toFixed(1)}ms`;
        }
        return `${Math.round(value)}ms`;
    });

    return (
        <div className="vertical-bar-chart">
            <div className="bar-chart-main">
                <div className="y-axis">
                    {yAxisLabels.map((label, idx) => (
                        <div key={idx} className="y-axis-label">
                            {label}
                        </div>
                    ))}
                </div>

                <div className="chart-area">
                    <div className="grid-lines">
                        {yAxisLabels.map((_, idx) => (
                            <div key={idx} className="grid-line" />
                        ))}
                    </div>

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

                    <div className="x-axis-baseline" />
                </div>
            </div>
        </div>
    );
};

// Icons
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

const Eye: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeOff: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
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
    webcamOn,
    agentState,
    latestMetrics,
    latestTranscription,
}) => {
    const [status, setStatus] = useState<string>("offline");
    const [metrics, setMetrics] = useState<any>(null);
    const [pipelineType, setPipelineType] = useState<string | null>(null);
    const [metricsHistory, setMetricsHistory] = useState<any[]>([]);
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const [systemInstructions, setSystemInstructions] = useState<string | null>(null);
    const [showInstructions, setShowInstructions] = useState(false);

    // Track the current speaker's transcript id so we can update it in-place
    const currentSpeakerRef = useRef<{ role: string; id: string } | null>(null);

    const { localParticipant, toggleMic } = useMeeting();
    const { micOn: isMicOn } = useParticipant(localParticipant?.id || "");

    const transcriptEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [transcripts]);

    // Agent state from hook
    useEffect(() => {
        if (!isJoined) {
            setStatus("offline");
            setMetricsHistory([]);
            setMetrics(null);
            setPipelineType(null);
            setTranscripts([]);
            setSystemInstructions(null);
            currentSpeakerRef.current = null;
            return;
        }
        if (agentState) {
            setStatus(agentState);
        }
    }, [agentState, isJoined]);

    // Process metrics — only for latency & provider info, NOT transcripts
    useEffect(() => {
        if (!latestMetrics) return;
        const payload = latestMetrics;

        // Capture system instructions (only sent in first turn)
        if (payload.systemInstructions && !systemInstructions) {
            setSystemInstructions(payload.systemInstructions);
        }

        // Detect pipeline type from providers
        if (payload.providers) {
            if (payload.providers.providerClass) {
                setPipelineType("realtime");
            } else if (payload.providers.sttProviderClass || payload.providers.llmProviderClass) {
                setPipelineType("cascading");
            }
        }

        // Map camelCase to snake_case for rendering
        const mapped: any = {};

        if (payload.latency) {
            if (payload.latency.e2eLatency != null) mapped.e2e_latency = payload.latency.e2eLatency;
            if (payload.latency.ttfb != null) mapped.ttfb = payload.latency.ttfb;
            if (payload.latency.sttLatency != null) mapped.stt_latency = payload.latency.sttLatency;
            if (payload.latency.ttft != null) mapped.llm_ttft = payload.latency.ttft;
            if (payload.latency.eouLatency != null) mapped.eou_latency = payload.latency.eouLatency;
        }

        if (payload.providers?.providerClass) {
            mapped.provider_class_name = payload.providers.providerClass;
            mapped.provider_model_name = payload.providers.modelName || "";
        }
        if (payload.providers?.sttProviderClass) {
            mapped.stt_provider_class = payload.providers.sttProviderClass;
            mapped.stt_model_name = payload.providers.sttModelName || "";
        }
        if (payload.providers?.llmProviderClass) {
            mapped.llm_provider_class = payload.providers.llmProviderClass;
            mapped.llm_model_name = payload.providers.llmModelName || "";
        }
        if (payload.providers?.ttsProviderClass) {
            mapped.tts_provider_class = payload.providers.ttsProviderClass;
            mapped.tts_model_name = payload.providers.ttsModelName || "";
        }

        setMetrics((prev: any) => ({ ...(prev || {}), ...mapped }));

        const latencyValues = payload.latency ? Object.values(payload.latency) : [];
        const hasMeaningfulLatency = latencyValues.length > 0 && latencyValues.some((v: any) => typeof v === 'number' && v > 0);
        if (hasMeaningfulLatency) {
            setMetricsHistory((prev: any[]) => [...prev, mapped].slice(-20));
        }
    }, [latestMetrics]);

    // Process transcriptions from onAgentTranscriptionReceived — the ONLY source of transcripts
    useEffect(() => {
        if (!latestTranscription) return;

        const { segment, participant } = latestTranscription;
        if (!segment?.text) return;

        const name = participant?.displayName || "";
        const isAgent = (participant as any)?.isAgent === true;
        const role = isAgent ? "agent" : "user";
        const participantName = name || (isAgent ? "Agent" : "User");
        const text = segment.text;
        const timestamp = segment.timestamp || Date.now();

        setTranscripts(prev => {
            const current = currentSpeakerRef.current;

            // Same speaker continuing — update their last entry in-place
            if (current && current.role === role) {
                const idx = prev.findIndex(t => t.id === current.id);
                if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = { ...updated[idx], text };
                    return updated;
                }
            }

            // New speaker or first message — finalize previous, create new entry
            const newId = `${role}-${Date.now()}-${Math.random()}`;
            currentSpeakerRef.current = { role, id: newId };

            return [...prev, {
                role,
                text,
                id: newId,
                uid: newId,
                participantName,
                timestamp,
            }].slice(-50);
        });
    }, [latestTranscription]);

    // Format helper
    const formatValue = (value: any, unit: string = "ms") => {
        if (value === null || value === undefined) return "-";
        if (unit === "ms") {
            if (value >= 1000) {
                return `${(value / 1000).toFixed(2)}s`;
            }
            if (value < 10) {
                return `${value.toFixed(2)}ms`;
            }
            return `${Math.round(value)}ms`;
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
                { label: "E2E Latency", value: formatValue(metrics.e2e_latency) },
            ]
            : [
                { label: "STT", value: `${metrics.stt_provider_class || "-"} / ${metrics.stt_model_name || "-"}` },
                { label: "LLM", value: `${metrics.llm_provider_class || "-"} / ${metrics.llm_model_name || "-"}` },
                { label: "TTS", value: `${metrics.tts_provider_class || "-"} / ${metrics.tts_model_name || "-"}` },
                { label: "STT Latency", value: formatValue(metrics.stt_latency) },
                { label: "LLM TTFT", value: formatValue(metrics.llm_ttft) },
                { label: "E2E Latency", value: formatValue(metrics.e2e_latency) },
                { label: "TTFB", value: formatValue(metrics.ttfb) },
                { label: "EOU Latency", value: formatValue(metrics.eou_latency) },
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
                                        <span className="role-label">
                                            {t.participantName || (t.role === "user" ? "User" : "Agent")}
                                        </span>
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

                    {/* System Instructions Panel */}
                    {systemInstructions && (
                        <div className="cc-panel system-instructions-panel">
                            <div className="panel-header">
                                <div className="header-left">
                                    <Info size={14} />
                                    <span>SYSTEM INSTRUCTIONS</span>
                                </div>
                                <button
                                    className="cc-icon-btn instructions-toggle"
                                    onClick={() => setShowInstructions(!showInstructions)}
                                    title={showInstructions ? "Hide instructions" : "Show instructions"}
                                >
                                    {showInstructions ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                            </div>
                            {showInstructions && (
                                <div className="system-instructions-content">
                                    <p>{systemInstructions}</p>
                                </div>
                            )}
                        </div>
                    )}

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
