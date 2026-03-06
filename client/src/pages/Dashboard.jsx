import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Camera, Mic, Languages } from 'lucide-react'
import { jsPDF } from 'jspdf'
import Tesseract from 'tesseract.js'
import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorkerSrc from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import { useAuth } from '../context/AuthContext.jsx'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

const API = import.meta.env.VITE_API_URL || '/api'

export default function Dashboard() {
  const { user, logout } = useAuth()

  const [selectedFeature, setSelectedFeature] = useState(null)
  const [detectedLang, setDetectedLang] = useState('')
  const [confidence, setConfidence] = useState(null)
  const [translatedText, setTranslatedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)

  const [detectInput, setDetectInput] = useState('')

  const [translateInput, setTranslateInput] = useState('')
  const [translateTargetLang, setTranslateTargetLang] = useState('Hindi')

  const [scanText, setScanText] = useState('')
  const [scanTargetLang, setScanTargetLang] = useState('Hindi')
  const [scanFileName, setScanFileName] = useState('')

  const [voiceText, setVoiceText] = useState('')
  const [voiceTargetLang, setVoiceTargetLang] = useState('Hindi')
  const [isListening, setIsListening] = useState(false)

  const [cameraText, setCameraText] = useState('')
  const [cameraTargetLang, setCameraTargetLang] = useState('Hindi')
  const [cameraOn, setCameraOn] = useState(false)

  const recognitionRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const cameraStreamRef = useRef(null)

  const languages = [
    'Hindi', 'English', 'Bengali', 'Tamil', 'Telugu', 'Marathi',
    'Gujarati', 'Punjabi', 'Urdu', 'French', 'Spanish', 'German',
    'Chinese', 'Japanese', 'Arabic',
  ]

  const speechLangMap = {
    Hindi: 'hi-IN',
    English: 'en-US',
    Bengali: 'bn-IN',
    Tamil: 'ta-IN',
    Telugu: 'te-IN',
    Marathi: 'mr-IN',
    Gujarati: 'gu-IN',
    Punjabi: 'pa-IN',
    Urdu: 'ur-PK',
    French: 'fr-FR',
    Spanish: 'es-ES',
    German: 'de-DE',
    Chinese: 'zh-CN',
    Japanese: 'ja-JP',
    Arabic: 'ar-SA',
  }

  const ocrLanguageMap = {
    Hindi: 'hin',
    English: 'eng',
    Bengali: 'ben',
    Tamil: 'tam',
    Telugu: 'tel',
    Marathi: 'mar',
    Gujarati: 'guj',
    Punjabi: 'pan',
    Urdu: 'urd',
    French: 'fra',
    Spanish: 'spa',
    German: 'deu',
    Chinese: 'chi_sim',
    Japanese: 'jpn',
    Arabic: 'ara',
  }

  const features = [
    {
      key: 'detect',
      title: 'Detect Language',
      desc: 'Paste text and detect language with confidence.',
      icon: Languages,
    },
    {
      key: 'translate',
      title: 'Translate',
      desc: 'Detect and translate text to selected language.',
      icon: FileText,
    },
    {
      key: 'scan',
      title: 'Scan & Translate',
      desc: 'Upload txt/pdf/docx/image, then detect and translate.',
      icon: FileText,
    },
    {
      key: 'voice',
      title: 'Voice Detect + Translate + Speak',
      desc: 'Listen, detect, translate, and speak output.',
      icon: Mic,
    },
    {
      key: 'camera',
      title: 'Camera Lens Translate',
      desc: 'Open camera, capture text, detect and translate like lens.',
      icon: Camera,
    },
  ]

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  })

  const resetStateForSwitch = () => {
    setDetectInput('')
    setTranslateInput('')
    setScanText('')
    setVoiceText('')
    setCameraText('')
    setDetectedLang('')
    setConfidence(null)
    setTranslatedText('')
    setScanFileName('')
    setLoading(false)
    setOcrLoading(false)

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
    window.speechSynthesis?.cancel()

    stopCamera()
  }

  const handleFeatureSelect = (featureKey) => {
    if (selectedFeature === featureKey) return
    resetStateForSwitch()
    setSelectedFeature(featureKey)
  }

  const handleBackToCards = () => {
    resetStateForSwitch()
    setSelectedFeature(null)
  }

  const getCurrentSourceText = () => {
    if (selectedFeature === 'detect') return detectInput
    if (selectedFeature === 'translate') return translateInput
    if (selectedFeature === 'scan') return scanText
    if (selectedFeature === 'voice') return voiceText
    if (selectedFeature === 'camera') return cameraText
    return ''
  }

  const detectLanguage = async (inputText) => {
    const response = await fetch(`${API}/detect-language`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ text: inputText }),
    })

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.message || 'Language detection failed')
    }

    setDetectedLang(data.language || '')
    setConfidence(data.confidence ?? null)
    return data
  }

  const translateText = async (inputText, targetLanguage, shouldSpeak = false) => {
    const response = await fetch(`${API}/translate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ text: inputText, targetLanguage }),
    })

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.message || 'Translation failed')
    }

    setTranslatedText(data.translation || '')

    if (shouldSpeak && data.translation) {
      const utterance = new SpeechSynthesisUtterance(data.translation)
      utterance.lang = speechLangMap[targetLanguage] || 'en-US'
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
    }

    return data
  }

  const saveHistory = async ({ feature, inputText, targetLanguage = '', translated = '' }) => {
    if (!inputText?.trim()) return

    try {
      await fetch(`${API}/history`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          feature,
          inputText,
          detectedLanguage: detectedLang,
          targetLanguage,
          translatedText: translated,
        }),
      })
    } catch {
      // Non-blocking history write
    }
  }

  const exportConversationPdf = () => {
    const sourceText = getCurrentSourceText()

    const targetLanguage =
      selectedFeature === 'translate' ? translateTargetLang
        : selectedFeature === 'scan' ? scanTargetLang
          : selectedFeature === 'voice' ? voiceTargetLang
            : selectedFeature === 'camera' ? cameraTargetLang
              : ''

    const doc = new jsPDF()
    const lines = [
      'Polyglot AI Translator - Conversation Export',
      `Feature: ${selectedFeature}`,
      `Detected Language: ${detectedLang || 'N/A'}`,
      `Target Language: ${targetLanguage || 'N/A'}`,
      '',
      'Input Text:',
      sourceText || 'N/A',
      '',
      'Translated Text:',
      translatedText || 'N/A',
    ]

    let y = 15
    lines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, 180)
      wrapped.forEach((part) => {
        doc.text(part, 15, y)
        y += 7
      })
      if (y > 270) {
        doc.addPage()
        y = 15
      }
    })

    doc.save(`conversation-${Date.now()}.pdf`)
  }

  const detectOnly = async (inputText, feature) => {
    if (!inputText.trim()) return
    setLoading(true)
    try {
      await detectLanguage(inputText)
      await saveHistory({ feature, inputText })
    } catch {
      setDetectedLang('Detection failed')
      setConfidence(null)
    } finally {
      setLoading(false)
    }
  }

  const detectAndTranslate = async (inputText, targetLanguage, feature, shouldSpeak = false) => {
    if (!inputText.trim()) return
    setLoading(true)
    try {
      await detectLanguage(inputText)
      const translated = await translateText(inputText, targetLanguage, shouldSpeak)
      await saveHistory({
        feature,
        inputText,
        targetLanguage,
        translated: translated.translation || '',
      })
    } catch (error) {
      const message = String(error?.message || '').toLowerCase()
      if (message.includes('network') || message.includes('fetch')) {
        setTranslatedText('Server connection issue. Please check backend is running on port 5000.')
      } else {
        setTranslatedText('Translation failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const extractTextFromPdf = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let content = ''

    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
      const page = await pdf.getPage(pageNo)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
      content += `${pageText}\n`
    }

    return content.trim()
  }

  const extractTextFromDocx = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value.trim()
  }

  const extractTextFromImage = async (file, targetLanguage) => {
    const ocrLang = ocrLanguageMap[targetLanguage] || 'eng'
    const result = await Tesseract.recognize(file, ocrLang, {
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    })
    return result.data.text?.trim() || ''
  }

  const handleScanUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setScanFileName(file.name)
    setOcrLoading(true)

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      let extracted = ''

      if (file.type === 'text/plain' || ext === 'txt') {
        extracted = (await file.text()).trim()
      } else if (file.type === 'application/pdf' || ext === 'pdf') {
        extracted = await extractTextFromPdf(file)
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        || ext === 'docx'
      ) {
        extracted = await extractTextFromDocx(file)
      } else if (ext === 'doc') {
        setTranslatedText('DOC format not directly supported. Please upload DOCX.')
        return
      } else {
        extracted = await extractTextFromImage(file, scanTargetLang)
      }

      if (!extracted) {
        setTranslatedText('No text detected from uploaded file')
        return
      }

      setScanText(extracted)
      setTranslatedText('')
    } catch {
      setTranslatedText('Scan failed. Try supported files: txt/pdf/docx/image')
    } finally {
      setOcrLoading(false)
      event.target.value = ''
    }
  }

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setTranslatedText('Voice recognition not supported in this browser')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => {
      setIsListening(false)
      setTranslatedText('Voice detection failed')
    }

    recognition.onresult = async (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || ''
      if (!transcript.trim()) return
      setVoiceText(transcript)
      await detectOnly(transcript, 'voice')
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopVoice = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      cameraStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraOn(true)
    } catch {
      setTranslatedText('Camera access denied or unavailable')
    }
  }

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }
    setCameraOn(false)
  }

  const captureFromCamera = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    setOcrLoading(true)
    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
      if (!blob) throw new Error('capture failed')
      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })

      const extracted = await extractTextFromImage(file, cameraTargetLang)
      setCameraText(extracted)
      await detectAndTranslate(extracted, cameraTargetLang, 'camera')
    } catch {
      setTranslatedText('Camera text scan failed')
    } finally {
      setOcrLoading(false)
    }
  }

  const renderFeaturePanel = () => {
    if (!selectedFeature) {
      return null
    }

    if (selectedFeature === 'detect') {
      return (
        <>
          <textarea
            value={detectInput}
            onChange={(e) => setDetectInput(e.target.value)}
            placeholder="Paste text here for language detection..."
            className="w-full h-44 p-4 rounded-2xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <div className="mt-4">
            <button onClick={() => detectOnly(detectInput, 'detect')} className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition">
              Detect Language
            </button>
          </div>
        </>
      )
    }

    if (selectedFeature === 'translate') {
      return (
        <>
          <textarea
            value={translateInput}
            onChange={(e) => setTranslateInput(e.target.value)}
            placeholder="Paste text here to detect and translate..."
            className="w-full h-44 p-4 rounded-2xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <button onClick={() => detectOnly(translateInput, 'translate')} className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition">
              Detect Language
            </button>
            <div>
              <p className="text-xs text-slate-400 mb-1">Select translation language</p>
              <select
                value={translateTargetLang}
                onChange={(e) => setTranslateTargetLang(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700"
              >
                {languages.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>
            <button
              onClick={() => detectAndTranslate(translateInput, translateTargetLang, 'translate')}
              className="md:col-span-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition"
            >
              Translate
            </button>
          </div>
        </>
      )
    }

    if (selectedFeature === 'scan') {
      return (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 cursor-pointer transition">
              Upload File (txt/pdf/docx/image)
              <input
                type="file"
                accept=".txt,.pdf,.doc,.docx,image/*"
                className="hidden"
                onChange={handleScanUpload}
              />
            </label>
            {scanFileName && <span className="text-sm text-slate-400">Selected: {scanFileName}</span>}
          </div>
          <textarea
            value={scanText}
            onChange={(e) => setScanText(e.target.value)}
            placeholder="Scanned text will appear here..."
            className="mt-4 w-full h-44 p-4 rounded-2xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <button onClick={() => detectOnly(scanText, 'scan')} className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition">
              Detect Language
            </button>
            <div>
              <p className="text-xs text-slate-400 mb-1">Select translation language</p>
              <select
                value={scanTargetLang}
                onChange={(e) => setScanTargetLang(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700"
              >
                {languages.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>
            <button
              onClick={() => detectAndTranslate(scanText, scanTargetLang, 'scan')}
              className="md:col-span-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition"
            >
              Translate
            </button>
          </div>
        </>
      )
    }

    if (selectedFeature === 'voice') {
      return (
        <>
          <textarea
            value={voiceText}
            onChange={(e) => setVoiceText(e.target.value)}
            placeholder="Voice transcript will appear here..."
            className="w-full h-44 p-4 rounded-2xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <button
              onClick={isListening ? stopVoice : startVoice}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition"
            >
              {isListening ? 'Stop Listening' : 'Start Listening'}
            </button>
            <div>
              <p className="text-xs text-slate-400 mb-1">Select translation language</p>
              <select
                value={voiceTargetLang}
                onChange={(e) => setVoiceTargetLang(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700"
              >
                {languages.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>
            <button
              onClick={() => detectAndTranslate(voiceText, voiceTargetLang, 'voice', true)}
              className="md:col-span-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition"
            >
              Translate + Speak
            </button>
          </div>
        </>
      )
    }

    return (
      <>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-3">
              <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl min-h-56 bg-black" />
            </div>
            <div className="flex gap-3">
              <button
                onClick={cameraOn ? stopCamera : startCamera}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition"
              >
                {cameraOn ? 'Stop Camera' : 'Open Camera'}
              </button>
              <button
                onClick={captureFromCamera}
                disabled={!cameraOn || ocrLoading}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-50"
              >
                Capture & Detect
              </button>
            </div>
          </div>
          <div>
            <textarea
              value={cameraText}
              onChange={(e) => setCameraText(e.target.value)}
              placeholder="Captured camera text will appear here..."
              className="w-full h-44 p-4 rounded-2xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="mt-4">
              <p className="text-xs text-slate-400 mb-1">Select translation language</p>
              <select
                value={cameraTargetLang}
                onChange={(e) => setCameraTargetLang(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700"
              >
                {languages.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
              </select>
              <button
                onClick={() => detectAndTranslate(cameraText, cameraTargetLang, 'camera')}
                className="mt-3 w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition"
              >
                Translate
              </button>
            </div>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <nav className="relative border-b border-slate-800/80 bg-slate-950/70 backdrop-blur px-6 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="text-xl font-semibold tracking-wide text-slate-50">
          Polyglot AI Translator
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/history" className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition">History</Link>
          <span className="text-slate-400 text-sm hidden md:block">
            {user?.name} <span className="text-slate-500">({user?.role})</span>
          </span>
          <button
            onClick={logout}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="relative max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl md:text-4xl font-semibold">Language Translation</h1>
        <p className="text-slate-400 mt-2">Choose any feature card and start detecting/translating.</p>

        {!selectedFeature && (
          <div className="mt-8 grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <button
                  key={feature.key}
                  onClick={() => handleFeatureSelect(feature.key)}
                  className="text-left rounded-2xl p-7 min-h-64 border bg-indigo-500/10 border-slate-700 hover:bg-indigo-500/15 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/20 transition duration-300"
                >
                  <div className="h-65 w-55 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center mb-5">
                    <Icon size={20} className="text-indigo-300" />
                  </div>
                  <p className="font-semibold text-lg">{feature.title}</p>
                  <p className="text-sm text-slate-400 mt-3 leading-relaxed">{feature.desc}</p>
                </button>
              )
            })}
          </div>
        )}

        {selectedFeature && (
          <div className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl shadow-slate-950/40">
            <div className="mb-5">
              <button
                onClick={handleBackToCards}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition"
              >
                ← Back to Feature Cards
              </button>
            </div>

            {renderFeaturePanel()}

            {(loading || ocrLoading) && (
              <div className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm">
                Processing...
              </div>
            )}

            {detectedLang && (
              <div className="mt-4 p-4 rounded-xl bg-slate-800 border border-slate-700">
                <p className="text-xs text-slate-400">Detected Language</p>
                <p className="mt-1 font-medium text-lg">{detectedLang}</p>
                {confidence !== null && (
                  <p className="text-sm text-slate-400 mt-1">Confidence: {(confidence * 100).toFixed(2)}%</p>
                )}
              </div>
            )}

            {translatedText && (
              <div className="mt-4 p-4 rounded-xl bg-slate-800 border border-slate-700">
                <p className="text-xs text-slate-400">Translated Text</p>
                <p className="mt-1 font-medium leading-relaxed">{translatedText}</p>
              </div>
            )}

            {(getCurrentSourceText() || detectedLang || translatedText) && (
              <div className="mt-4">
                <button
                  onClick={exportConversationPdf}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition"
                >
                  Download Conversation PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
