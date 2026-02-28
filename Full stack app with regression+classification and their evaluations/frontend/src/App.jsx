import { useState, useCallback } from 'react'

function App() {
  const [file, setFile] = useState(null)
  const [filename, setFilename] = useState('')
  const [columns, setColumns] = useState([])
  const [targetColumn, setTargetColumn] = useState('')
  const [taskType, setTaskType] = useState('classification')

  const [uploadStatus, setUploadStatus] = useState('')
  const [trainStatus, setTrainStatus] = useState('')
  const [metrics, setMetrics] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isTraining, setIsTraining] = useState(false)

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    setUploadStatus('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (response.ok) {
        setUploadStatus('success')
        setFilename(data.filename)
        setColumns(data.columns)
        if (data.columns.length > 0) {
          setTargetColumn(data.columns[data.columns.length - 1]) // default to last column
        }
      } else {
        setUploadStatus('error')
        console.error(data.detail)
      }
    } catch (error) {
      setUploadStatus('error')
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleTrain = async () => {
    if (!filename || !targetColumn) return
    setIsTraining(true)
    setTrainStatus('')
    setMetrics(null)

    try {
      const response = await fetch('http://localhost:8000/api/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          target_column: targetColumn,
          task_type: taskType
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setTrainStatus('success')
        setMetrics(data.metrics)
      } else {
        setTrainStatus('error')
        console.error(data.detail)
      }
    } catch (error) {
      setTrainStatus('error')
      console.error('Training failed:', error)
    } finally {
      setIsTraining(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Data Science Portal
          </h1>
          <p className="text-slate-500 text-lg">
            Train and evaluate machine learning models in seconds.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Left Column: Input Panel */}
          <div className="space-y-6">

            {/* Upload Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-semibold mb-4 text-slate-800">1. Upload Dataset</h2>

              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors
                  ${file ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center space-y-3">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div className="text-sm text-slate-600">
                    {file ? (
                      <span className="font-medium text-blue-600">{file.name}</span>
                    ) : (
                      <>
                        <label className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                          <span>Click to upload</span>
                          <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                        </label>
                        <p>or drag and drop your CSV file here</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center"
              >
                {isUploading ? (
                  <span className="inline-block animate-spin mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                ) : null}
                Upload File
              </button>

              {uploadStatus === 'success' && (
                <p className="mt-3 text-sm text-green-600 font-medium text-center">Dataset uploaded successfully!</p>
              )}
            </div>

            {/* Configuration Card */}
            <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 transition-opacity ${columns.length > 0 ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <h2 className="text-xl font-semibold mb-4 text-slate-800">2. Configure Model</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Column</label>
                  <select
                    value={targetColumn}
                    onChange={(e) => setTargetColumn(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Task Type</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => setTaskType('classification')}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${taskType === 'classification' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Classification
                    </button>
                    <button
                      onClick={() => setTaskType('regression')}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${taskType === 'regression' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Regression
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleTrain}
                  disabled={!filename || isTraining}
                  className="mt-6 w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center"
                >
                  {isTraining ? (
                    <span className="inline-block animate-spin mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                  ) : null}
                  Train & Evaluate Model
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Results Panel */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full min-h-[400px]">
              <h2 className="text-xl font-semibold mb-6 text-slate-800">Evaluation Results</h2>

              {!metrics && !isTraining && (
                <div className="flex flex-col items-center justify-center h-[300px] text-slate-400 text-center">
                  <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p>Train a model to see evaluation metrics here.</p>
                </div>
              )}

              {isTraining && (
                <div className="flex flex-col items-center justify-center h-[300px] text-blue-600">
                  <span className="inline-block animate-spin mb-4 border-4 border-blue-600 border-t-transparent rounded-full w-12 h-12"></span>
                  <p className="font-medium animate-pulse">Training Random Forest model...</p>
                </div>
              )}

              {metrics && !isTraining && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-full mb-2 border border-blue-100">
                    {metrics.Model}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(metrics).filter(([k]) => k !== 'Model').map(([key, value]) => (
                      <div key={key} className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                        <p className="text-sm text-slate-500 font-medium mb-1">{key}</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {typeof value === 'number' && (key.includes('RMSE') || key.includes('MSE') || key.includes('MAE'))
                            ? value.toFixed(4)
                            : typeof value === 'number'
                              ? (value * 100).toFixed(2) + '%'
                              : value
                          }
                        </p>
                      </div>
                    ))}
                  </div>

                  {trainStatus === 'success' && taskType === 'classification' && (
                    <div className="mt-6 p-4 bg-green-50 text-green-800 rounded-lg text-sm border border-green-100 flex items-start">
                      <svg className="w-5 h-5 mr-2 shrink-0 text-green-600 mix-blend-multiply" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <p>Model generalized successfully. Evaluation metrics are calculated on a 20% holdout test set.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default App
