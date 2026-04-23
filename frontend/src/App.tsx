import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TrainingRunSocket } from './api/phase1MockService'
import { runExplainer } from './api/phase2MockService'
import {
  buildArchitecturePreset,
  buildTemporalSnapshots,
  defaultGraphTransformerConfig,
} from './api/phase3MockService'
import {
  useDatasetByNameQuery,
  useDatasetListQuery,
  useStartTrainingMutation,
  useTrainingRunsQuery,
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
import { AdminWorkspace } from './components/layout/AdminWorkspace'
import { AppHeader } from './components/layout/AppHeader'
import { LabOverview } from './components/layout/LabOverview'
import type { AdminTab } from './components/social/AdminPanel'
import { AuthPanel } from './components/social/AuthPanel'
import { CommunityPanel } from './components/social/CommunityPanel'
import { ProfilePanel } from './components/social/ProfilePanel'
import { VaultPanel } from './components/social/VaultPanel'
import { messagePassingPhases } from './data/mockGnn'
import { useSocialPlatform } from './hooks/useSocialPlatform'
import { AuthPage } from './pages/AuthPage'
import { LandingPage } from './pages/LandingPage'
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

const makeRandomAttention = () =>
  [0, 1, 2, 3].map(() => Number((0.12 + Math.random() * 0.8).toFixed(3)))

function App() {
  const [appScreen, setAppScreen] = useState<'landing' | 'auth' | 'app'>('landing')
  const [model, setModel] = useState<ModelType>('GAT')
  const [messageStep, setMessageStep] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const [animationSpeed, setAnimationSpeed] = useState(1.2)
  const [uploadMessage, setUploadMessage] = useState('Upload a JSON graph dataset to replace the current workspace.')
  const [history, setHistory] = useState<TrainingPoint[]>([])
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([])
  const [explanation, setExplanation] = useState<ExplainerResult | null>(null)
  const [explanationThreshold, setExplanationThreshold] = useState(0.5)
  const [isExplaining, setIsExplaining] = useState(false)
  const [activeView, setActiveView] = useState<AppView>('lab')
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('overview')
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
  const previousUserIdRef = useRef<string | null>(null)
  const loadedDatasetKeyRef = useRef<string | null>(null)
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
  const trainingProgress = useModelStore((state) => state.trainingProgress)
  const setIsTraining = useModelStore((state) => state.setIsTraining)
  const setCurrentModelId = useModelStore((state) => state.setCurrentModelId)
  const setTrainingProgress = useModelStore((state) => state.setTrainingProgress)
  const setCurrentEpoch = useModelStore((state) => state.setCurrentEpoch)
  const setSelectedDataset = useModelStore((state) => state.setSelectedDataset)

  const datasetsQuery = useDatasetListQuery()
  const datasetCatalog = datasetsQuery.data ?? []
  const selectedDatasetQuery = useDatasetByNameQuery(
    selectedDataset,
    datasetCatalog.includes(selectedDataset) && selectedDataset !== 'Custom JSON',
  )
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
  const trainingRunsQuery = useTrainingRunsQuery(Boolean(currentUser))
  const trainingRuns = trainingRunsQuery.data ?? []
  const activeScreen = currentUser ? 'app' : appScreen

  const appendEvent = useCallback((message: string, level: StreamEvent['level'] = 'info') => {
    setStreamEvents((prev) => [toEvent(message, level), ...prev].slice(0, 18))
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
    applyGraphState(baseGraph.nodes, baseGraph.edges, 'Returned to the base static graph.', {
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
      const datasetKey = `${dataset.name}:${dataset.nodes.length}:${dataset.edges.length}`

      loadedDatasetKeyRef.current = datasetKey
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
    const nextUserId = currentUser?.id ?? null
    const previousUserId = previousUserIdRef.current

    if (nextUserId && nextUserId !== previousUserId && currentUser) {
      setActiveView(currentUser.role === 'admin' ? 'admin' : 'lab')
      setActiveAdminTab('overview')
    }

    if (!nextUserId && previousUserId) {
      setActiveView('lab')
      setActiveAdminTab('overview')
    }

    previousUserIdRef.current = nextUserId
  }, [currentUser])

  useEffect(() => {
    if (!selectedDatasetQuery.data) return
    const dataset = selectedDatasetQuery.data
    const datasetKey = `${dataset.name}:${dataset.nodes.length}:${dataset.edges.length}`
    if (loadedDatasetKeyRef.current === datasetKey) return
    loadedDatasetKeyRef.current = datasetKey
    applyDataset(dataset)
  }, [applyDataset, selectedDatasetQuery.data])

  useEffect(() => {
    if (!selectedDatasetQuery.error) return
    const message =
      selectedDatasetQuery.error instanceof Error ? selectedDatasetQuery.error.message : 'Dataset load failed.'
    setUploadMessage(message)
    appendEvent(`Could not load ${selectedDataset}: ${message}`, 'warn')
  }, [appendEvent, selectedDataset, selectedDatasetQuery.error])

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
          `Epoch ${event.epoch}/${event.epochs} | loss ${event.loss.toFixed(3)} | acc ${(
            event.accuracy * 100
          ).toFixed(1)}%`,
          event.type === 'done' ? 'success' : 'info',
        )
      }

      if (event.type === 'done') {
        setIsTraining(false)
        void socket.close()
        void trainingRunsQuery.refetch()
        appendEvent(`Training completed for ${model} on ${selectedDataset}.`, 'success')
      }
    })

    socket.open()
  }

  const handleSelectDataset = useCallback(
    (datasetName: string) => {
      if (datasetName === selectedDataset) return
      setExplanation(null)

      if (datasetName === 'Custom JSON') {
        setSelectedDataset(datasetName)
        setUploadMessage('Select a JSON file to load your custom graph dataset.')
        appendEvent('Custom dataset selected. Upload a JSON graph to replace the current workspace.')
        return
      }

      setSelectedDataset(datasetName)
      setUploadMessage(`Loading "${datasetName}" from the dataset catalog...`)
      appendEvent(`Loading dataset: ${datasetName}.`)
    },
    [appendEvent, selectedDataset, setSelectedDataset],
  )

  const handleUploadFile = (file: File) => {
    uploadDatasetMutation.mutate(file, {
      onSuccess: (dataset) => {
        const safeName =
          dataset.name && datasetCatalog.includes(dataset.name) ? `${dataset.name} (Uploaded)` : dataset.name
        applyDataset({ ...dataset, name: safeName || 'Custom Dataset' })
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Upload failed.'
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
      void trainingRunsQuery.refetch()
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
          void trainingRunsQuery.refetch()
          openTrainingSocket(job.jobId)
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : 'Could not start training job.'
          setIsTraining(false)
          setCurrentTrainingRunId(null)
          appendEvent(message, 'warn')
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
        appendEvent(`Edge ${source} <-> ${target} already exists.`, 'warn')
        return
      }

      const newEdge: GraphEdge = {
        id: `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        source,
        target,
        weight: 1,
        attentionByHead: makeRandomAttention(),
      }

      applyGraphState(nodes, [...edges, newEdge], `Edge created: ${source} -> ${target}.`, {
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
      const result = await runExplainer({ nodeId: selectedNodeId, nodes, edges })
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
        appendEvent('Temporal mode enabled. Use the timeline to inspect dynamic graph states.')
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
            <h2 className="panel-title">Loading workspace...</h2>
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

  if (activeScreen === 'landing') {
    return <LandingPage onGetStarted={() => setAppScreen('auth')} />
  }

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

  if (currentUser?.role === 'admin' && activeView === 'admin') {
    return (
      <AdminWorkspace
        currentUser={currentUser}
        activeTab={activeAdminTab}
        onTabChange={setActiveAdminTab}
        onViewChange={handleViewChange}
        onLogout={async () => {
          await logout()
          setAppScreen('landing')
        }}
        overview={adminOverview}
        users={socialUsers}
        posts={allSocialPosts}
        trainingRuns={trainingRuns}
        onSetUserRole={setUserRole}
        onSetUserStatus={setUserStatus}
        onRemovePost={removePostAsAdmin}
      />
    )
  }

  return (
    <div className="app-shell">
      <div className="bg-glow bg-glow-a" />
      <div className="bg-glow bg-glow-b" />

      <AppHeader
        selectedDataset={selectedDataset}
        activeView={activeView}
        currentUser={currentUser}
        onViewChange={handleViewChange}
        onRequireAuth={() => setAppScreen('auth')}
        onLogout={async () => {
          await logout()
          setAppScreen('landing')
        }}
      />

      {activeView === 'lab' ? (
        <div className="lab-page">
          <LabOverview
            selectedDataset={selectedDataset}
            model={trainingDescriptor}
            nodeCount={nodeCount}
            edgeCount={edgeCount}
            selectedNodeCount={selectedNodes.length}
            temporalMode={temporalMode}
            isTraining={isTraining}
            currentEpoch={currentEpoch}
            currentTrainingRunId={currentTrainingRunId}
            trainingProgress={trainingProgress}
          />

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
              datasets={datasetCatalog.length > 0 ? datasetCatalog : ['Cora Citation Network', 'PubMed', 'Citeseer', 'Custom JSON']}
              uploadMessage={uploadMessage}
              onSelectDataset={handleSelectDataset}
              onUploadFile={handleUploadFile}
              onToggleTraining={handleToggleTraining}
              isUploading={uploadDatasetMutation.isPending}
              isQueueing={startTrainingMutation.isPending}
              isDatasetLoading={selectedDatasetQuery.isLoading}
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
              <GraphTransformerPanel model={model} config={transformerConfig} onChange={setTransformerConfig} />
              <LiveStreamPanel events={streamEvents} />
            </div>
          </main>
        </div>
      ) : (
        renderSocialView()
      )}
    </div>
  )
}

export default App
