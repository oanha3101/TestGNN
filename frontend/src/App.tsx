import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { runExplainer } from './api/phase2MockService'
import { LandingPage } from './pages/LandingPage'
import { AuthPage } from './pages/AuthPage'
import {
  buildArchitecturePreset,
  buildTemporalSnapshots,
  defaultGraphTransformerConfig,
} from './api/phase3MockService'
import { TrainingRunSocket } from './api/phase1MockService'
import {
  useDatasetListQuery,
  useDefaultDatasetQuery,
  useStartTrainingMutation,
  useUploadDatasetMutation,
} from './api/hooks'
import { LiveStreamPanel } from './components/activity/LiveStreamPanel'
import { AttentionVizPanel } from './components/analysis/AttentionVizPanel'
import { DynamicGraphTimeline } from './components/analysis/DynamicGraphTimeline'
import { GraphTransformerPanel } from './components/analysis/GraphTransformerPanel'
import { ArchitectureBuilder } from './components/control/ArchitectureBuilder'
import { ControlPanel } from './components/control/ControlPanel'
import { EmbeddingViewer } from './components/dashboard/EmbeddingViewer'
import { ModelComparisonPanel } from './components/dashboard/ModelComparisonPanel'
import { TrainingDashboard } from './components/dashboard/TrainingDashboard'
import { GraphCanvas } from './components/graph/GraphCanvas'
import { MessagePassingTimeline } from './components/graph/MessagePassingTimeline'
import { NodeDetail } from './components/inspector/NodeDetail'
import { AppHeader } from './components/layout/AppHeader'
import { AdminPanel } from './components/social/AdminPanel'
import { AuthPanel } from './components/social/AuthPanel'
import { CommunityPanel } from './components/social/CommunityPanel'
import { ProfilePanel } from './components/social/ProfilePanel'
import { VaultPanel } from './components/social/VaultPanel'
import { initialStreamEvents, messagePassingPhases } from './data/mockGnn'
import { useSocialPlatform } from './hooks/useSocialPlatform'
import { useGraphStore, useModelStore } from './store/useStore'
import type { AppView } from './types/app'
import type {
  ArchitectureSchema,
  ExplainerResult,
  GraphDataset,
  GraphEdge,
  GraphNode,
  GraphTransformerConfig,
  ModelType,
  StreamEvent,
  TemporalSnapshot,
  TrainingPoint,
} from './types/gnn'
import { toGraphEntities } from './utils/graph'

const toEvent = (message: string, level: StreamEvent['level'] = 'info'): StreamEvent => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  level,
  message,
  createdAt: Date.now(),
})

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const withUpdatedDegree = (nodes: GraphNode[], edges: GraphEdge[]) => {
  const degreeMap = new Map(nodes.map((node) => [node.id, 0]))
  for (const edge of edges) {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) ?? 0) + 1)
    degreeMap.set(edge.target, (degreeMap.get(edge.target) ?? 0) + 1)
  }
  return nodes.map((node) => ({ ...node, degree: degreeMap.get(node.id) ?? 0 }))
}

const repredictNodes = (nodes: GraphNode[]) => {
  return nodes.map((node) => ({
    ...node,
    confidence: Number(clamp(node.confidence + (Math.random() - 0.5) * 0.1, 0.55, 0.98).toFixed(3)),
  }))
}

const makeRandomAttention = () => [
  Number((0.12 + Math.random() * 0.8).toFixed(3)),
  Number((0.12 + Math.random() * 0.8).toFixed(3)),
  Number((0.12 + Math.random() * 0.8).toFixed(3)),
  Number((0.12 + Math.random() * 0.8).toFixed(3)),
]

function App() {
  // ── Screen routing: 'landing' → 'auth' → 'app' ──────────────
  const [appScreen, setAppScreen] = useState<'landing' | 'auth' | 'app'>('landing')

  const [model, setModel] = useState<ModelType>('GAT')
  const [messageStep, setMessageStep] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const [animationSpeed, setAnimationSpeed] = useState(1.2)
  const [uploadMessage, setUploadMessage] = useState('Upload JSON graph dataset to replace current graph.')
  const [history, setHistory] = useState<TrainingPoint[]>([])
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>(initialStreamEvents)
  const [explanation, setExplanation] = useState<ExplainerResult | null>(null)
  const [explanationThreshold, setExplanationThreshold] = useState(0.5)
  const [isExplaining, setIsExplaining] = useState(false)
  const [activeView, setActiveView] = useState<AppView>('lab')
  const [currentTrainingRunId, setCurrentTrainingRunId] = useState<string | null>(null)
  const [transformerConfig, setTransformerConfig] = useState<GraphTransformerConfig>(
    defaultGraphTransformerConfig,
  )
  const [architecture, setArchitecture] = useState<ArchitectureSchema>(() => buildArchitecturePreset('GAT'))
  const [temporalMode, setTemporalMode] = useState(false)
  const [temporalStep, setTemporalStep] = useState(0)
  const [temporalAutoPlay, setTemporalAutoPlay] = useState(false)
  const [temporalSnapshots, setTemporalSnapshots] = useState<TemporalSnapshot[]>([])

  const socketRef = useRef<TrainingRunSocket | null>(null)
  const initializedDatasetRef = useRef(false)
  const baseGraphRef = useRef<{ nodes: GraphNode[]; edges: GraphEdge[] }>({
    nodes: [],
    edges: [],
  })

  const nodes = useGraphStore((state) => state.nodes)
  const edges = useGraphStore((state) => state.edges)
  const selectedNodes = useGraphStore((state) => state.selectedNodes)
  const setGraphData = useGraphStore((state) => state.setGraphData)
  const setSelectedNodes = useGraphStore((state) => state.setSelectedNodes)

  const nodeCount = nodes.length
  const edgeCount = edges.length

  const isTraining = useModelStore((state) => state.isTraining)
  const selectedDataset = useModelStore((state) => state.selectedDataset)
  const currentEpoch = useModelStore((state) => state.currentEpoch)
  const autoRepredict = useModelStore((state) => state.autoRepredict)
  const setIsTraining = useModelStore((state) => state.setIsTraining)
  const setCurrentModelId = useModelStore((state) => state.setCurrentModelId)
  const setTrainingProgress = useModelStore((state) => state.setTrainingProgress)
  const setCurrentEpoch = useModelStore((state) => state.setCurrentEpoch)
  const setSelectedDataset = useModelStore((state) => state.setSelectedDataset)

  const datasetsQuery = useDatasetListQuery()
  const defaultDatasetQuery = useDefaultDatasetQuery()
  const uploadDatasetMutation = useUploadDatasetMutation()
  const startTrainingMutation = useStartTrainingMutation()

  const {
    users: socialUsers,
    posts: socialPosts,
    allPosts: allSocialPosts,
    myPosts,
    vault,
    vaultPostIds,
    currentUser,
    adminOverview,
    isLoading: isSocialLoading,
    isBusy: isSocialBusy,
    error: socialError,
    login,
    register,
    logout,
    createPost,
    updatePost,
    deletePost,
    toggleVault,
    toggleLike,
    saveProfile,
    setUserRole,
    setUserStatus,
    removePostAsAdmin,
  } = useSocialPlatform()
  const activeScreen = currentUser ? 'app' : appScreen

  const appendEvent = useCallback((message: string, level: StreamEvent['level'] = 'info') => {
    setStreamEvents((prev) => [toEvent(message, level), ...prev].slice(0, 16))
  }, [])

  const regenerateTemporalSnapshots = useCallback((nextNodes: GraphNode[], nextEdges: GraphEdge[]) => {
    setTemporalSnapshots(buildTemporalSnapshots(nextNodes, nextEdges))
  }, [])

  const applyGraphState = useCallback(
    (
      nextNodes: GraphNode[],
      nextEdges: GraphEdge[],
      infoMessage?: string,
      options?: { skipRepredict?: boolean; preserveAsBase?: boolean },
    ) => {
      const cleanEdges = nextEdges.filter(
        (edge) =>
          edge.source !== edge.target &&
          nextNodes.some((node) => node.id === edge.source) &&
          nextNodes.some((node) => node.id === edge.target),
      )
      const updatedNodes = withUpdatedDegree(nextNodes, cleanEdges)
      const predictionNodes = options?.skipRepredict
        ? updatedNodes
        : autoRepredict
          ? repredictNodes(updatedNodes)
          : updatedNodes

      setGraphData(predictionNodes, cleanEdges)
      if (options?.preserveAsBase) {
        baseGraphRef.current = { nodes: predictionNodes, edges: cleanEdges }
        regenerateTemporalSnapshots(predictionNodes, cleanEdges)
      }
      if (infoMessage) appendEvent(infoMessage, 'success')
    },
    [appendEvent, autoRepredict, regenerateTemporalSnapshots, setGraphData],
  )

  const applyTemporalSnapshot = useCallback(
    (snapshot: TemporalSnapshot) => {
      applyGraphState(snapshot.nodes, snapshot.edges, undefined, {
        skipRepredict: true,
        preserveAsBase: false,
      })
    },
    [applyGraphState],
  )

  const restoreBaseGraph = useCallback(() => {
    const baseGraph = baseGraphRef.current
    if (baseGraph.nodes.length === 0) return
    applyGraphState(baseGraph.nodes, baseGraph.edges, 'Returned to base static graph.', {
      skipRepredict: true,
      preserveAsBase: false,
    })
  }, [applyGraphState])

  const applyTemporalStep = useCallback(
    (nextStep: number) => {
      const snapshot = temporalSnapshots[nextStep]
      if (!snapshot) return
      applyTemporalSnapshot(snapshot)
    },
    [applyTemporalSnapshot, temporalSnapshots],
  )

  const applyDataset = useCallback(
    (dataset: GraphDataset) => {
      const graph = toGraphEntities(dataset)
      applyGraphState(graph.nodes, graph.edges, undefined, { preserveAsBase: true })
      setSelectedDataset(dataset.name)
      setUploadMessage(`Loaded "${dataset.name}" with ${graph.nodes.length} nodes and ${graph.edges.length} edges.`)
      setExplanation(null)
      appendEvent(`Dataset ready: ${dataset.name}.`, 'success')
    },
    [appendEvent, applyGraphState, setSelectedDataset],
  )

  const resetTrainingState = () => {
    setTrainingProgress(0)
    setCurrentEpoch(0)
    setHistory([])
  }

  const selectedNodeId = selectedNodes[0] ?? null

  useEffect(() => {
    if (!defaultDatasetQuery.data || initializedDatasetRef.current) return
    applyDataset(defaultDatasetQuery.data)
    initializedDatasetRef.current = true
  }, [applyDataset, defaultDatasetQuery.data])

  useEffect(() => {
    setCurrentModelId(`model-${model.toLowerCase()}`)
  }, [model, setCurrentModelId])

  useEffect(() => {
    if (!autoPlay || !isTraining) return
    const interval = Math.max(260, Math.floor(1400 / animationSpeed))
    const timer = window.setInterval(() => {
      setMessageStep((prev) => (prev + 1) % messagePassingPhases.length)
    }, interval)
    return () => window.clearInterval(timer)
  }, [animationSpeed, autoPlay, isTraining])

  useEffect(() => {
    if (!temporalMode || !temporalAutoPlay || temporalSnapshots.length < 2) return
    const timer = window.setInterval(() => {
      setTemporalStep((prev) => {
        const next = (prev + 1) % temporalSnapshots.length
        applyTemporalStep(next)
        return next
      })
    }, 1200)
    return () => window.clearInterval(timer)
  }, [applyTemporalStep, temporalAutoPlay, temporalMode, temporalSnapshots.length])

  useEffect(() => {
    return () => {
      void socketRef.current?.close()
      socketRef.current = null
    }
  }, [])

  const openTrainingSocket = (jobId: string) => {
    void socketRef.current?.close()
    const socket = new TrainingRunSocket(jobId)
    socketRef.current = socket

    socket.subscribe((event) => {
      setCurrentEpoch(event.epoch)
      setTrainingProgress((event.epoch / event.epochs) * 100)
      setHistory((prev) => [
        ...prev,
        { epoch: event.epoch, loss: event.loss, accuracy: Number((event.accuracy * 100).toFixed(2)) },
      ])

      if (event.epoch % 10 === 0 || event.type === 'done') {
        appendEvent(
          `Epoch ${event.epoch}/${event.epochs} • loss ${event.loss.toFixed(3)} • acc ${(
            event.accuracy * 100
          ).toFixed(1)}%`,
          event.type === 'done' ? 'success' : 'info',
        )
      }

      if (event.type === 'done') {
        setIsTraining(false)
        void socket.close()
        const numericId = Number(jobId)
        if (Number.isFinite(numericId)) {
          useModelStore.getState().setLastCompletedRunId(numericId)
        }
        appendEvent(`Training completed for ${model} on ${selectedDataset}.`, 'success')
      }
    })

    void socket.open()
  }

  const handleUploadFile = (file: File) => {
    uploadDatasetMutation.mutate(file, {
      onSuccess: (dataset) => applyDataset(dataset),
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Upload failed'
        setUploadMessage(message)
        appendEvent(`Dataset upload failed: ${message}`, 'warn')
      },
    })
  }

  const trainingDescriptor = useMemo(() => {
    if (model !== 'GraphTransformer') return model
    return `${model} ${transformerConfig.variant} (${transformerConfig.layers}L/${transformerConfig.heads}H)`
  }, [model, transformerConfig.heads, transformerConfig.layers, transformerConfig.variant])

  const handleToggleTraining = () => {
    if (isTraining) {
      void socketRef.current?.close('canceled')
      socketRef.current = null
      setIsTraining(false)
      appendEvent('Training paused by user.', 'warn')
      return
    }

    resetTrainingState()
    setCurrentTrainingRunId(null)
    appendEvent(`Starting ${trainingDescriptor} on ${selectedDataset}.`)

    startTrainingMutation.mutate(
      { model, datasetName: selectedDataset },
      {
        onSuccess: (job) => {
          setIsTraining(true)
          setCurrentTrainingRunId(job.jobId)
          appendEvent(`Job queued: ${job.jobId}`)
          openTrainingSocket(job.jobId)
        },
        onError: () => {
          setIsTraining(false)
          setCurrentTrainingRunId(null)
          appendEvent('Could not start training job.', 'warn')
        },
      },
    )
  }

  const nextNodeId = useMemo(() => {
    const maxId = nodes
      .map((node) => Number(node.id.replace(/\D/g, '')))
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), -1)
    return `v${maxId + 1}`
  }, [nodes])

  const handleAddNode = () => {
    if (temporalMode) return
    const node: GraphNode = {
      id: nextNodeId,
      x: Number((14 + Math.random() * 72).toFixed(2)),
      y: Number((14 + Math.random() * 64).toFixed(2)),
      degree: 0,
      label: Math.floor(Math.random() * 4),
      confidence: Number((0.62 + Math.random() * 0.3).toFixed(3)),
      features: Array.from({ length: 6 }, () => Number((Math.random() * 0.95).toFixed(3))),
    }
    applyGraphState([...nodes, node], edges, `Node ${node.id} added.`, { preserveAsBase: true })
  }

  const handleDeleteSelectedNodes = useCallback(() => {
    if (selectedNodes.length === 0 || temporalMode) return
    const removeSet = new Set(selectedNodes)
    const nextNodes = nodes.filter((node) => !removeSet.has(node.id))
    const nextEdges = edges.filter((edge) => !removeSet.has(edge.source) && !removeSet.has(edge.target))
    applyGraphState(nextNodes, nextEdges, `Deleted ${selectedNodes.length} selected node(s).`, {
      preserveAsBase: true,
    })
    setSelectedNodes([])
    if (explanation && removeSet.has(explanation.nodeId)) setExplanation(null)
  }, [applyGraphState, edges, explanation, nodes, selectedNodes, setSelectedNodes, temporalMode])

  const connectNodes = useCallback(
    (source: string, target: string) => {
      if (temporalMode) return
      if (!source || !target || source === target) return
      const exists = edges.some(
        (edge) =>
          (edge.source === source && edge.target === target) ||
          (edge.source === target && edge.target === source),
      )
      if (exists) {
        appendEvent(`Edge ${source} ↔ ${target} already exists.`, 'warn')
        return
      }
      const newEdge: GraphEdge = {
        id: `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        source,
        target,
        weight: 1,
        attentionByHead: makeRandomAttention(),
      }
      applyGraphState(nodes, [...edges, newEdge], `Edge created: ${source} → ${target}.`, {
        preserveAsBase: true,
      })
    },
    [appendEvent, applyGraphState, edges, nodes, temporalMode],
  )

  const handleConnectSelectedNodes = () => {
    if (selectedNodes.length < 2) return
    connectNodes(selectedNodes[0], selectedNodes[1])
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const targetTag = (event.target as HTMLElement | null)?.tagName
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') return
      if (event.key === 'Delete') {
        event.preventDefault()
        handleDeleteSelectedNodes()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleDeleteSelectedNodes])

  const handleRunExplainer = async () => {
    if (!selectedNodeId) {
      appendEvent('Select a node first to run GNNExplainer.', 'warn')
      return
    }
    setIsExplaining(true)
    appendEvent(`Running explainer for ${selectedNodeId}...`)
    try {
      const result = await runExplainer({
        nodeId: selectedNodeId,
        nodes,
        edges,
      })
      setExplanation(result)
      appendEvent(`Explainer complete for ${selectedNodeId}. Score ${(result.score * 100).toFixed(1)}%.`, 'success')
    } catch (error) {
      appendEvent(error instanceof Error ? error.message : 'Explainer failed.', 'warn')
    } finally {
      setIsExplaining(false)
    }
  }

  const handleViewChange = (view: AppView) => {
    if (view === 'admin' && currentUser?.role !== 'admin') {
      appendEvent('Admin view requires an admin account.', 'warn')
      return
    }
    setActiveView(view)
  }

  const handleResetArchitecture = useCallback(() => {
    const next = buildArchitecturePreset(model)
    setArchitecture(next)
    appendEvent(`Architecture preset reloaded for ${model}.`, 'success')
  }, [appendEvent, model])

  const handleTemporalModeChange = useCallback(
    (enabled: boolean) => {
      setTemporalAutoPlay(false)
      setTemporalMode(enabled)
      if (enabled) {
        setTemporalStep(0)
        applyTemporalStep(0)
        appendEvent('Temporal mode enabled. Use timeline to inspect dynamic graph states.')
        return
      }
      restoreBaseGraph()
    },
    [appendEvent, applyTemporalStep, restoreBaseGraph],
  )

  const handleTemporalStepChange = useCallback(
    (step: number) => {
      setTemporalStep(step)
      if (!temporalMode) return
      applyTemporalStep(step)
    },
    [applyTemporalStep, temporalMode],
  )

  const renderSocialView = () => {
    if (isSocialLoading) {
      return (
        <main className="single-layout">
          <section className="panel social-panel">
            <h2 className="panel-title">Loading social workspace...</h2>
          </section>
        </main>
      )
    }

    if (!currentUser) {
      return (
        <main className="single-layout">
          <AuthPanel isBusy={isSocialBusy} error={socialError} onLogin={login} onRegister={register} />
        </main>
      )
    }

    if (activeView === 'community') {
      return (
        <main className="single-layout">
          <CommunityPanel
            currentUser={currentUser}
            users={socialUsers}
            posts={socialPosts}
            vaultPostIds={vaultPostIds}
            model={model}
            selectedDataset={selectedDataset}
            currentEpoch={currentEpoch}
            trainingHistory={history}
            currentTrainingRunId={currentTrainingRunId}
            onCreatePost={createPost}
            onUpdatePost={updatePost}
            onDeletePost={deletePost}
            onToggleVault={toggleVault}
            onToggleLike={toggleLike}
          />
        </main>
      )
    }

    if (activeView === 'vault') {
      return (
        <main className="single-layout">
          <VaultPanel
            currentUser={currentUser}
            users={socialUsers}
            posts={socialPosts}
            vault={vault}
            onToggleVault={toggleVault}
            onToggleLike={toggleLike}
            onUpdatePost={updatePost}
            onDeletePost={deletePost}
          />
        </main>
      )
    }

    if (activeView === 'profile') {
      return (
        <main className="single-layout">
          <ProfilePanel currentUser={currentUser} myPosts={myPosts} onSaveProfile={saveProfile} />
        </main>
      )
    }

    if (activeView === 'admin' && currentUser.role === 'admin') {
      return (
        <main className="single-layout">
          <AdminPanel
            overview={adminOverview}
            users={socialUsers}
            posts={allSocialPosts}
            onSetUserRole={setUserRole}
            onSetUserStatus={setUserStatus}
            onRemovePost={removePostAsAdmin}
          />
        </main>
      )
    }

    return (
      <main className="single-layout">
        <CommunityPanel
          currentUser={currentUser}
          users={socialUsers}
          posts={socialPosts}
          vaultPostIds={vaultPostIds}
          model={model}
          selectedDataset={selectedDataset}
          currentEpoch={currentEpoch}
          trainingHistory={history}
          currentTrainingRunId={currentTrainingRunId}
          onCreatePost={createPost}
          onUpdatePost={updatePost}
          onDeletePost={deletePost}
          onToggleVault={toggleVault}
          onToggleLike={toggleLike}
        />
      </main>
    )
  }

  // ── Screen: Landing ──────────────────────────────────────────
  if (activeScreen === 'landing') {
    return <LandingPage onGetStarted={() => setAppScreen('auth')} />
  }

  // ── Screen: Auth ─────────────────────────────────────────────
  if (activeScreen === 'auth' && !currentUser) {
    return (
      <AuthPage
        isBusy={isSocialBusy}
        error={socialError}
        onLogin={async (input) => {
          await login(input)
        }}
        onRegister={async (input) => {
          await register(input)
        }}
        onBack={() => setAppScreen('landing')}
      />
    )
  }

  return (
    <div className="app-shell">
      <div className="bg-glow bg-glow-a" />
      <div className="bg-glow bg-glow-b" />

      <AppHeader
        isTraining={isTraining}
        selectedDataset={selectedDataset}
        currentEpoch={currentEpoch}
        nodeCount={nodeCount}
        edgeCount={edgeCount}
        activeView={activeView}
        currentUser={currentUser}
        onViewChange={handleViewChange}
        onRequireAuth={() => setActiveView('community')}
        onLogout={async () => {
          await logout()
          setAppScreen('landing')
        }}
      />

      {activeView === 'lab' ? (
        <main className="layout">
          <ControlPanel
            model={model}
            setModel={setModel}
            messageStep={messageStep}
            setMessageStep={setMessageStep}
            autoPlay={autoPlay}
            setAutoPlay={setAutoPlay}
            animationSpeed={animationSpeed}
            setAnimationSpeed={setAnimationSpeed}
            datasets={datasetsQuery.data ?? ['Cora Citation Network', 'PubMed', 'Citeseer', 'Custom JSON']}
            uploadMessage={uploadMessage}
            onUploadFile={handleUploadFile}
            onToggleTraining={handleToggleTraining}
            isUploading={uploadDatasetMutation.isPending}
            isQueueing={startTrainingMutation.isPending}
            selectedNodeCount={selectedNodes.length}
            onAddNode={handleAddNode}
            onDeleteSelectedNodes={handleDeleteSelectedNodes}
            onConnectSelectedNodes={handleConnectSelectedNodes}
            temporalMode={temporalMode}
          />

          <div className="center-column">
            <GraphCanvas
              messageStep={messageStep}
              explanation={explanation}
              explanationThreshold={explanationThreshold}
              onCreateEdgeRequest={connectNodes}
              canEdit={!temporalMode}
            />
            <MessagePassingTimeline
              step={messageStep}
              setStep={setMessageStep}
              autoPlay={autoPlay}
              setAutoPlay={setAutoPlay}
              animationSpeed={animationSpeed}
            />
            <DynamicGraphTimeline
              enabled={temporalMode}
              onEnabledChange={handleTemporalModeChange}
              step={temporalStep}
              onStepChange={handleTemporalStepChange}
              autoPlay={temporalAutoPlay}
              onAutoPlayChange={setTemporalAutoPlay}
              snapshots={temporalSnapshots}
            />
            <div className="analytics-row">
              <TrainingDashboard model={model} trainingHistory={history} />
              <EmbeddingViewer />
            </div>
            <ModelComparisonPanel />
            <ArchitectureBuilder
              model={model}
              schema={architecture}
              onChange={setArchitecture}
              onResetPreset={handleResetArchitecture}
            />
          </div>

          <div className="right-column">
            <NodeDetail
              model={model}
              explanation={explanation}
              explanationThreshold={explanationThreshold}
              isExplaining={isExplaining}
              onRunExplain={handleRunExplainer}
              onThresholdChange={setExplanationThreshold}
            />
            <AttentionVizPanel explanation={explanation} threshold={explanationThreshold} />
            <GraphTransformerPanel
              model={model}
              config={transformerConfig}
              onChange={setTransformerConfig}
            />
            <LiveStreamPanel events={streamEvents} />
          </div>
        </main>
      ) : (
        renderSocialView()
      )}
    </div>
  )
}

export default App
