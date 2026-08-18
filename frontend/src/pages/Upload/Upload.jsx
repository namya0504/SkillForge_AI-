import React, { useState, useRef, useEffect } from 'react';
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { resumeAPI, jobAPI } from '../../services/api';
import StepIndicator from '../../components/StepIndicator/StepIndicator';
import './Upload.css';

const Upload = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('initial'); // initial, uploading, processing, completed, error
  const [dragActive, setDragActive] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [result, setResult] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const fileInputRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const navigate = useNavigate();

  const steps = ['Upload Resume', 'Confirm Skills', 'Select Role'];

  const validateFile = (selectedFile) => {
    setError(null);
    if (!selectedFile) return false;

    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.pdf') && !selectedFile.name.endsWith('.docx')) {
      setError('Please upload a PDF or DOCX file.');
      return false;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.');
      return false;
    }

    return true;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        handleUpload(droppedFile);
      }
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        handleUpload(selectedFile);
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const startPolling = (currentJobId) => {
    setElapsedTime(0);
    
    timerIntervalRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const job = await jobAPI.getStatus(currentJobId);
        if (job.status === 'completed') {
          clearInterval(pollingIntervalRef.current);
          clearInterval(timerIntervalRef.current);
          setResult(job.result);
          setStatus('completed');
        } else if (job.status === 'failed') {
          clearInterval(pollingIntervalRef.current);
          clearInterval(timerIntervalRef.current);
          let friendlyMsg = job.errorMsg || 'Failed to process resume.';
          if (friendlyMsg.includes('ENOENT') || friendlyMsg.includes('zip file')) {
            friendlyMsg = 'Could not read the uploaded resume file. Please ensure it is a valid text-based PDF or DOCX file and try uploading again.';
          }
          setError(friendlyMsg);
          setStatus('error');
        }
      } catch (err) {
        clearInterval(pollingIntervalRef.current);
        clearInterval(timerIntervalRef.current);
        setError(err.message || 'Error checking status.');
        setStatus('error');
      }
    }, 2000);
  };

  const handleUpload = async (uploadFile) => {
    setFile(uploadFile);
    setStatus('uploading');
    setError(null);

    try {
      const response = await resumeAPI.upload(uploadFile);
      setJobId(response.jobId);
      setStatus('processing');
      startPolling(response.jobId);
    } catch (err) {
      setError(err.message || 'Failed to upload resume.');
      setStatus('error');
    }
  };

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const resetUpload = () => {
    setFile(null);
    setJobId(null);
    setResult(null);
    setError(null);
    setElapsedTime(0);
    setStatus('initial');
  };

  return (
    <div className="upload-page">
      <div className="upload-container">
        <div className="upload-header">
          <h1>Let's build your profile</h1>
          <p>Upload your resume to get personalized skill recommendations.</p>
        </div>

        <StepIndicator steps={steps} currentStep={0} />

        <div className="upload-content">
          {status === 'initial' && (
            <div 
              className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={onButtonClick}
              onKeyDown={(e) => e.key === 'Enter' && onButtonClick()}
              tabIndex={0}
              role="button"
              aria-label="Upload resume"
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleChange} 
                style={{ display: 'none' }}
              />
              <div className="drop-zone-content">
                <div className="upload-icon-wrapper">
                  <UploadIcon size={48} />
                </div>
                <h2>Drag & drop your resume here</h2>
                <p>or click to browse &bull; PDF or DOCX &bull; Max 5MB</p>
              </div>
            </div>
          )}

          {error && status === 'initial' && (
            <div className="error-message inline">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {(status === 'uploading' || status === 'processing') && (
            <div className="processing-card">
              <div className="file-info-badge">
                <FileText size={24} className="file-icon" />
                <span className="filename">{file?.name}</span>
              </div>
              
              <div className="status-timeline">
                <div className="timeline-item completed">
                  <div className="timeline-icon"><CheckCircle size={20} /></div>
                  <div className="timeline-text">File uploaded</div>
                </div>
                <div className={`timeline-item ${status === 'processing' ? 'active' : 'pending'}`}>
                  <div className="timeline-icon">
                    {status === 'processing' ? <RefreshCw size={20} className="spin-icon" /> : <div className="dot" />}
                  </div>
                  <div className="timeline-text">
                    {status === 'processing' ? `Extracting text... (${elapsedTime}s)` : 'Extracting text...'}
                  </div>
                </div>
                <div className="timeline-item pending">
                  <div className="timeline-icon"><div className="dot" /></div>
                  <div className="timeline-text">Analyzing skills & experience...</div>
                </div>
              </div>

              <div className="progress-bar-container">
                <div className="progress-bar indeterminate"></div>
              </div>
            </div>
          )}

          {status === 'completed' && result && (
            <div className="results-container">
              <div className="results-header">
                <div className="success-badge">
                  <CheckCircle size={24} />
                  <h2>Resume Analyzed Successfully</h2>
                </div>
                <button className="btn-link" onClick={resetUpload}>Upload a different resume</button>
              </div>

              <div className="parsed-data-grid">
                <div className="parsed-section skills-section">
                  <h3>Extracted Skills</h3>
                  <div className="skills-chips">
                    {result.skills?.map((skill, i) => (
                      <span key={i} className={`skill-chip proficiency-${skill.proficiency?.toLowerCase() || 'beginner'}`}>
                        {skill.name}
                      </span>
                    ))}
                    {(!result.skills || result.skills.length === 0) && (
                      <p className="no-data">No skills found.</p>
                    )}
                  </div>
                </div>

                <div className="parsed-section experience-section">
                  <h3>Experience</h3>
                  <div className="experience-list">
                    {result.experience?.map((exp, i) => (
                      <div key={i} className="experience-card">
                        <h4>{exp.title}</h4>
                        <p className="company">{exp.company}</p>
                        <p className="duration">{exp.duration}</p>
                      </div>
                    ))}
                    {(!result.experience || result.experience.length === 0) && (
                      <p className="no-data">No experience found.</p>
                    )}
                  </div>
                </div>

                <div className="parsed-section education-section">
                  <h3>Education & Certifications</h3>
                  <div className="education-list">
                    {result.education?.map((edu, i) => (
                      <div key={`edu-${i}`} className="education-card">
                        <h4>{edu.degree}</h4>
                        <p className="institution">{edu.institution}</p>
                        <p className="year">{edu.year}</p>
                      </div>
                    ))}
                    {result.certifications?.map((cert, i) => (
                      <div key={`cert-${i}`} className="education-card">
                        <h4>{cert.name}</h4>
                        <p className="institution">{cert.issuer}</p>
                      </div>
                    ))}
                    {(!result.education?.length && !result.certifications?.length) && (
                      <p className="no-data">No education or certifications found.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="results-actions flex-actions">
                <button className="btn-secondary" onClick={() => navigate('/skills')}>
                  Review Extracted Skills <ChevronRight size={18} />
                </button>
                <button className="btn-primary" onClick={() => navigate('/dashboard')}>
                  Go to Dashboard & Roadmap <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="error-card">
              <div className="error-icon-wrapper">
                <AlertCircle size={48} />
              </div>
              <h2>Something went wrong</h2>
              <p>{error}</p>
              <div className="error-actions">
                <button className="btn-primary" onClick={resetUpload}>Try Again</button>
                <Link to="/skills" className="btn-link">Enter skills manually</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Upload;
