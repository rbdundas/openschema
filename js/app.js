import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import useAuth from './hooks/useAuth';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState, 
  Handle, 
  Position,
  MarkerType 
} from '@xyflow/react';

/* ------------------------------------------------------------------ *
 * 1. React Auth Header Widget
 * ------------------------------------------------------------------ */
function AuthApp() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [username, setUsername] = useState(''); // email for login
  const [password, setPassword] = useState('');
  const [regUsername, setRegUsername] = useState(''); // email for registration
  const [regPassword, setRegPassword] = useState(''); // password for registration
  const [infoMessage, setInfoMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' | 'info' | 'error'
  const [regInfoMessage, setRegInfoMessage] = useState('');
  const [regMessageType, setRegMessageType] = useState(''); // 'success' | 'info' | 'error'

  const { user, login, register, loading, error, setError, logout } = useAuth();

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClose = () => setIsDropdownOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [isDropdownOpen]);

  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#login') {
        setIsModalOpen(true);
        window.history.replaceState("", document.title, window.location.pathname + window.location.search);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  useEffect(() => {
    const loginLink = document.getElementById('nav-login-link');
    if (loginLink) {
      loginLink.style.display = user ? 'none' : 'inline-block';
    }
  }, [user]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setUsername('');
    setPassword('');
    setInfoMessage('');
    setMessageType('');
    setError(null);
  };

  const handleCloseRegisterModal = () => {
    setIsRegisterModalOpen(false);
    setRegUsername('');
    setRegPassword('');
    setRegInfoMessage('');
    setRegMessageType('');
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    const trimmedUsername = username.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedUsername)) {
      setMessageType('error');
      setInfoMessage('Username must be a valid email address.');
      return;
    }

    setMessageType('info');
    setInfoMessage('Working…');

    const result = await login(trimmedUsername, password);
    if (result.success) {
      setMessageType('success');
      setInfoMessage('Signed in. Opening Open Schema portal…');
      handleCloseModal();
      window.location.assign('/schema.html');
    } else {
      setMessageType('error');
      setInfoMessage(result.error || 'Invalid credentials.');
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    const trimmedUsername = regUsername.trim();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedUsername)) {
      setRegMessageType('error');
      setRegInfoMessage('Email address format is invalid.');
      return;
    }

    const complexity = checkPasswordComplexity(regPassword);
    if (!Object.values(complexity).every(Boolean)) {
      setRegMessageType('error');
      setRegInfoMessage('Password does not satisfy all complexity requirements.');
      return;
    }

    setRegMessageType('info');
    setRegInfoMessage('Creating account…');

    const result = await register(trimmedUsername, regPassword);
    if (result.success) {
      setRegMessageType('success');
      setRegInfoMessage(`User "${trimmedUsername}" created successfully.`);
      setTimeout(() => {
        handleCloseRegisterModal();
      }, 1500);
    } else {
      setRegMessageType('error');
      setRegInfoMessage(result.error || 'Registration failed.');
    }
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    const result = await logout();
    if (result.success) {
      setIsDropdownOpen(false);
      window.location.assign('/');
    }
  };

  const checkPasswordComplexity = (p) => {
    return {
      hasMinLength: p.length >= 8,
      hasUpper: /[A-Z]/.test(p),
      hasLower: /[a-z]/.test(p),
      hasDigit: /\d/.test(p),
      hasSpecial: /[@$!%*?&]/.test(p)
    };
  };

  const pComplexity = checkPasswordComplexity(regPassword);

  const displayedMessage = infoMessage || error;
  const isError = messageType === 'error' || error;
  const messageClass = `auth-message${isError ? ' is-error' : messageType ? ` is-${messageType}` : ''}`;

  const regDisplayedMessage = regInfoMessage;
  const regIsError = regMessageType === 'error';
  const regMessageClass = `auth-message${regIsError ? ' is-error' : regMessageType ? ` is-${regMessageType}` : ''}`;

  const modalContent = isModalOpen ? (
    <div className="modal-overlay" onClick={handleCloseModal}>
      <div className="auth" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={handleCloseModal} aria-label="Close modal">
          &times;
        </button>
        <p className="auth-eyebrow">Open Schema Foundation</p>
        <h1>
          OpenSchema<span className="auth-mark">Flow</span>
        </h1>
        <p className="auth-sub" style={{ margin: '0 0 1.5rem 0' }}>Sign in to access the schema portal.</p>

        <form onSubmit={handleLoginSubmit} noValidate>
          <label htmlFor="username">Email Address</label>
          <input
            id="username"
            name="username"
            type="email"
            autoComplete="email"
            placeholder="e.g. admin@openschema.foundation"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" id="submit-btn" disabled={loading} style={{ marginTop: '1rem' }}>
            Log in
          </button>
        </form>

        {displayedMessage && (
          <p className={messageClass} role="status" aria-live="polite">
            {displayedMessage}
          </p>
        )}
      </div>
    </div>
  ) : null;

  const registerModalContent = isRegisterModalOpen ? (
    <div className="modal-overlay" onClick={handleCloseRegisterModal}>
      <div className="auth" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <button type="button" className="modal-close-btn" onClick={handleCloseRegisterModal} aria-label="Close modal">
          &times;
        </button>
        <p className="auth-eyebrow">Admin Console</p>
        <h1>Register New User</h1>
        <p className="auth-sub" style={{ margin: '0 0 1.25rem 0' }}>Define credentials for a new authorized portal user.</p>

        <form onSubmit={handleRegisterSubmit} noValidate>
          <label htmlFor="reg-username">Email Address</label>
          <input
            id="reg-username"
            name="reg-username"
            type="email"
            autoComplete="off"
            placeholder="e.g. user@openschema.foundation"
            value={regUsername}
            onChange={(e) => setRegUsername(e.target.value)}
            required
          />

          <label htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            name="reg-password"
            type="password"
            autoComplete="new-password"
            placeholder="Create password"
            value={regPassword}
            onChange={(e) => setRegPassword(e.target.value)}
            required
          />

          {/* Dynamic Complexity Checklist */}
          <div style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Password Requirements</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
              <span style={{ color: pComplexity.hasMinLength ? '#22c55e' : '#64748b' }}>{pComplexity.hasMinLength ? "✓" : "●"}</span>
              <span style={{ color: pComplexity.hasMinLength ? '#f8fafc' : '#94a3b8' }}>At least 8 characters</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
              <span style={{ color: pComplexity.hasUpper ? '#22c55e' : '#64748b' }}>{pComplexity.hasUpper ? "✓" : "●"}</span>
              <span style={{ color: pComplexity.hasUpper ? '#f8fafc' : '#94a3b8' }}>One uppercase letter (A-Z)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
              <span style={{ color: pComplexity.hasLower ? '#22c55e' : '#64748b' }}>{pComplexity.hasLower ? "✓" : "●"}</span>
              <span style={{ color: pComplexity.hasLower ? '#f8fafc' : '#94a3b8' }}>One lowercase letter (a-z)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
              <span style={{ color: pComplexity.hasDigit ? '#22c55e' : '#64748b' }}>{pComplexity.hasDigit ? "✓" : "●"}</span>
              <span style={{ color: pComplexity.hasDigit ? '#f8fafc' : '#94a3b8' }}>One numeric digit (0-9)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
              <span style={{ color: pComplexity.hasSpecial ? '#22c55e' : '#64748b' }}>{pComplexity.hasSpecial ? "✓" : "●"}</span>
              <span style={{ color: pComplexity.hasSpecial ? '#f8fafc' : '#94a3b8' }}>One special symbol (@$!%*?&)</span>
            </div>
          </div>

          <button type="submit" id="reg-submit-btn" disabled={loading} style={{ marginTop: '1.25rem' }}>
            Register User
          </button>
        </form>

        {regDisplayedMessage && (
          <p className={regMessageClass} role="status" aria-live="polite" style={{ marginTop: '0.8rem' }}>
            {regDisplayedMessage}
          </p>
        )}
      </div>
    </div>
  ) : null;

  const modalRoot = document.getElementById('auth-modal-root');

  return (
    <div className="auth-header-widget">
      {user ? (
        <>
          <button 
            type="button" 
            className="user-avatar-btn" 
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(prev => !prev);
            }}
            aria-label="User menu"
            id="user-avatar-button"
          >
            {user.username.charAt(0).toUpperCase()}
          </button>
          
          {isDropdownOpen && (
            <div className="auth-dropdown" onClick={(e) => e.stopPropagation()} role="menu">
              <div className="dropdown-user-info">
                <p className="dropdown-label">Account</p>
                <p className="dropdown-username" id="dropdown-username-display">{user.username}</p>
              </div>
              <a href="/schema.html" className="dropdown-link" id="dropdown-portal-link">
                Schema Portal
              </a>
              <button 
                type="button" 
                className="dropdown-link" 
                style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 0, padding: '0.65rem 1rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen(false);
                  setIsRegisterModalOpen(true);
                }}
                id="dropdown-register-btn"
              >
                Register New User
              </button>
              <button 
                type="button" 
                className="btn-dropdown-logout" 
                onClick={handleLogout}
                id="dropdown-logout-btn"
              >
                Log out
              </button>
            </div>
          )}
        </>
      ) : (
        <button 
          type="button" 
          className="btn-login" 
          onClick={() => setIsModalOpen(true)}
          id="login-trigger-btn"
        >
          Log in
        </button>
      )}

      {modalRoot && modalContent && createPortal(modalContent, modalRoot)}
      {modalRoot && registerModalContent && createPortal(registerModalContent, modalRoot)}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 2. React Flow Custom Custom Node Components
 * ------------------------------------------------------------------ */
function ReactFlowStartNode({ data }) {
  const activeClass = data.isActive ? 'is-active' : '';
  return (
    <div className={`bpmn-custom-node start ${activeClass}`}>
      <div className="circle-node" />
      <div className="node-label">{data.label}</div>
      <Handle type="source" position={Position.Right} id="s" style={{ background: '#22c55e', width: 8, height: 8 }} />
    </div>
  );
}

function ReactFlowEndNode({ data }) {
  const activeClass = data.isActive ? 'is-active' : '';
  return (
    <div className={`bpmn-custom-node end ${activeClass}`}>
      <div className="circle-node" />
      <div className="node-label">{data.label}</div>
      <Handle type="target" position={Position.Left} id="t" style={{ background: '#ef4444', width: 8, height: 8 }} />
    </div>
  );
}

function ReactFlowGatewayNode({ data }) {
  const activeClass = data.isActive ? 'is-active' : '';
  return (
    <div className={`bpmn-custom-node gateway ${activeClass}`}>
      <div className="diamond-node">
        <span className="diamond-text">✕</span>
      </div>
      <div className="node-label">{data.label}</div>
      <Handle type="target" position={Position.Left} id="t" style={{ background: '#eab308', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} id="s" style={{ background: '#eab308', width: 8, height: 8 }} />
    </div>
  );
}

function ReactFlowTaskNode({ data, type }) {
  const activeClass = data.isActive ? 'is-active' : '';
  const selectedClass = data.isSelected ? 'is-selected' : '';
  return (
    <div className={`bpmn-custom-node task ${activeClass} ${selectedClass}`}>
      <div className="task-badge">{type.replace('_', ' ')}</div>
      <div className="task-title">{data.label}</div>
      <Handle type="target" position={Position.Left} id="t" style={{ background: '#38bdf8', width: 6, height: 6 }} />
      <Handle type="source" position={Position.Right} id="s" style={{ background: '#38bdf8', width: 6, height: 6 }} />
    </div>
  );
}

// React Flow custom node representing visual Schema definitions (ERD)
function ERDEntityNode({ data }) {
  const getHeaderColor = (category) => {
    switch (category) {
      case 'Commercial': return '#0891b2'; // Cyan
      case 'Resources': return '#7c3aed';  // Purple
      case 'Financials': return '#d97706'; // Orange/Gold
      default: return '#10b981';           // Emerald
    }
  };

  return (
    <div className="erd-node-container">
      <div className="erd-node-header" style={{ background: getHeaderColor(data.category) }}>
        <span className="erd-icon">{data.icon}</span>
        <span className="erd-name">{data.title}</span>
      </div>
      <div className="erd-node-fields-list">
        {data.fields.map((f, i) => (
          <div key={i} className="erd-field-row">
            <span className="erd-field-name">{f.name}</span>
            <span className={`type-badge ${f.type}`} style={{ fontSize: '0.65rem', padding: '0.05rem 0.3rem' }}>{f.type}</span>
          </div>
        ))}
      </div>
      <Handle type="target" position={Position.Left} id="t" style={{ background: '#cbd5e1', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} id="s" style={{ background: '#cbd5e1', width: 8, height: 8 }} />
    </div>
  );
}

const reactFlowNodeTypes = {
  start: ReactFlowStartNode,
  end: ReactFlowEndNode,
  gateway: ReactFlowGatewayNode,
  user_input: ReactFlowTaskNode,
  webhook: ReactFlowTaskNode,
  erd: ERDEntityNode
};

/* ------------------------------------------------------------------ *
 * 3. Workbench Entities Raw Database Scaffolding
 * ------------------------------------------------------------------ */
const initialEntitiesDatabase = {};
const deprecatedEntitiesDatabase = {
  employee: {
    title: "Employee Entity",
    icon: "👤",
    category: "Resources",
    desc: "Generic internal worker structure for capturing standard staff records, salaries, and employment timelines.",
    flowTitle: "Employee Onboarding Workflow",
    flowDesc: "Verifies worker credentials, fires compliance check integrations, generates employment documents, and configures corporate accounts.",
    schema: [
      { name: "id", type: "string", desc: "Unique employee database identifier.", constraints: "UUID, Primary Key" },
      { name: "first_name", type: "string", desc: "Legal first name.", constraints: "Required, max 50 chars" },
      { name: "last_name", type: "string", desc: "Legal last name.", constraints: "Required, max 50 chars" },
      { name: "email", type: "string", desc: "Official organizational email.", constraints: "Required, Unique, Email validation" },
      { name: "role", type: "string", desc: "Organizational position title.", constraints: "Required, ENUM" },
      { name: "department", type: "string", desc: "Target corporate cost center.", constraints: "Required, ENUM" },
      { name: "salary", type: "number", desc: "Annual base salary rate.", constraints: "Required, Min 0.00" },
      { name: "hire_date", type: "date", desc: "Employment contract commencement date.", constraints: "Required" },
      { name: "status", type: "string", desc: "Current working state.", constraints: "ENUM (active, inactive, leave)" }
    ],
    bpmn: {
      nodes: [
        { id: "start", type: "start", label: "Start Onboard", position: { x: 50, y: 120 } },
        { id: "verify_docs", type: "user_input", label: "Verify Documents", position: { x: 180, y: 90 }, assignee: "HR Generalist", inputs: "ID, Credentials Docs", outputs: "ValidStatus (boolean)", details: "Validates identification documents, verifying tax status and eligibility." },
        { id: "bg_check", type: "webhook", label: "Background Check", position: { x: 370, y: 90 }, url: "https://api.checkr.com/v1/verify", inputs: "first_name, last_name, ssn", outputs: "score, status", details: "Automated background and security compliance screening check via web hook." },
        { id: "check_gate", type: "gateway", label: "Passed Screening?", position: { x: 560, y: 100 }, condition: "bg_check.status == 'cleared'", details: "Conditional check routing execution based on background clearance status." },
        { id: "contract_sign", type: "user_input", label: "Sign Contract", position: { x: 700, y: 90 }, assignee: "Employee candidate", inputs: "Template ID, Salary, Role", outputs: "Signature document key", details: "Sends digital employment agreements to candidate. execution waits until completed." },
        { id: "it_provision", type: "webhook", label: "IT Account Setup", position: { x: 890, y: 90 }, url: "https://api.okta.com/v1/users", inputs: "email, first_name, role", outputs: "okta_id, password_setup_url", details: "Triggers Okta API workflows to create company logins and access controls." },
        { id: "end", type: "end", label: "Onboard Complete", position: { x: 1080, y: 120 } }
      ],
      edges: [
        { id: "e-start-verify", source: "start", target: "verify_docs" },
        { id: "e-verify-bg", source: "verify_docs", target: "bg_check" },
        { id: "e-bg-gate", source: "bg_check", target: "check_gate" },
        { id: "e-gate-sign", source: "check_gate", target: "contract_sign" },
        { id: "e-sign-it", source: "contract_sign", target: "it_provision" },
        { id: "e-it-end", source: "it_provision", target: "end" }
      ],
      steps: [
        { node: "start", log: "Starting Employee Onboarding Process for candidate...", type: "system" },
        { node: "verify_docs", log: "HR Generalist triggered task: Verification of physical credentials docs...", type: "info" },
        { node: "verify_docs", log: "Verify Documents task completed: valid status confirmed.", type: "success" },
        { node: "bg_check", log: "Webhook triggered: POST https://api.checkr.com/v1/verify...", type: "info" },
        { node: "bg_check", log: "Webhook response: 200 OK. Clearance status: 'cleared'.", type: "success" },
        { node: "check_gate", log: "Conditional Gate: evaluating clearance status == 'cleared'. Condition satisfied.", type: "system" },
        { node: "contract_sign", log: "Pending User action: Waiting for document signature capture...", type: "warning" },
        { node: "contract_sign", log: "Candidate signed contract document key: 'doc_552912_signed'.", type: "success" },
        { node: "it_provision", log: "Webhook triggered: POST https://api.okta.com/v1/users...", type: "info" },
        { node: "it_provision", log: "Webhook response: 201 Created. okta_id: 'usr_abc8921'.", type: "success" },
        { node: "end", log: "Employee Onboarding Workflow complete. Record status changed to 'active'.", type: "success" }
      ]
    }
  },
  client: {
    title: "Client Entity",
    icon: "🏢",
    category: "Commercial",
    desc: "Corporate or individual buyer database schema capturing demographics, industry classification, and billing specifications.",
    flowTitle: "Client Intake & KYC Workflow",
    flowDesc: "Screens customer prospects against compliance lists, auto-registers customer profiles, and generates portal access.",
    schema: [
      { name: "id", type: "string", desc: "Unique client record identifier.", constraints: "UUID, Primary Key" },
      { name: "company_name", type: "string", desc: "Full legal business organization name.", constraints: "Required, max 100 chars" },
      { name: "contact_name", type: "string", desc: "Primary administrative point of contact.", constraints: "Required" },
      { name: "email", type: "string", desc: "Contact email address.", constraints: "Required, Email validation" },
      { name: "phone", type: "string", desc: "Contact phone number.", constraints: "E.164 standard format" },
      { name: "industry", type: "string", desc: "Primary economic sector grouping.", constraints: "Optional" },
      { name: "billing_address", type: "json", desc: "Structured billing coordinates mapping.", constraints: "Required, JSON structure" },
      { name: "status", type: "string", desc: "Client account state.", constraints: "ENUM (lead, active, suspended, closed)" }
    ],
    bpmn: {
      nodes: [
        { id: "start", type: "start", label: "Start Intake", position: { x: 50, y: 120 } },
        { id: "kyc_screen", type: "webhook", label: "KYC Screener", position: { x: 180, y: 90 }, url: "https://api.complyadvantage.com/v3/screen", inputs: "company_name, country", outputs: "risk_level, match_status", details: "Fires automated sanction screening search check matching AML requirements." },
        { id: "verify_gate", type: "gateway", label: "Clear?", position: { x: 370, y: 100 }, condition: "risk_level == 'low'", details: "Validates screening output to route client approvals." },
        { id: "assign_rep", type: "user_input", label: "Assign Rep", position: { x: 500, y: 90 }, assignee: "Sales Team Lead", inputs: "industry, company_name", outputs: "account_rep_id", details: "Manual assignment of matching Account Manager based on region/industry." },
        { id: "welcome_email", type: "webhook", label: "Welcome Setup", position: { x: 690, y: 90 }, url: "https://api.sendgrid.com/v3/mail/send", inputs: "email, contact_name", outputs: "sendgrid_status", details: "Drafts and executes welcome templates containing portal login linkages." },
        { id: "end", type: "end", label: "Client Active", position: { x: 880, y: 120 } }
      ],
      edges: [
        { id: "e-start-kyc", source: "start", target: "kyc_screen" },
        { id: "e-kyc-gate", source: "kyc_screen", target: "verify_gate" },
        { id: "e-gate-assign", source: "verify_gate", target: "assign_rep" },
        { id: "e-assign-mail", source: "assign_rep", target: "welcome_email" },
        { id: "e-mail-end", source: "welcome_email", target: "end" }
      ],
      steps: [
        { node: "start", log: "Intake pipeline started for client lead...", type: "system" },
        { node: "kyc_screen", log: "Webhook triggered: POST AML screener on database records...", type: "info" },
        { node: "kyc_screen", log: "Sanction screening completed. risk_level: 'low', matches: 0.", type: "success" },
        { node: "verify_gate", log: "Evaluating conditions: risk_level == 'low' (satisfied). Routing to task.", type: "system" },
        { node: "assign_rep", log: "Sales Team Lead: choosing Account Representative assignment...", type: "info" },
        { node: "assign_rep", log: "Rep assigned successfully. rep_id: 'usr_rep_john_doe'.", type: "success" },
        { node: "welcome_email", log: "Webhook triggered: Sending Welcome Portal link details via SMTP...", type: "info" },
        { node: "welcome_email", log: "SMTP Mail sent successfully. SendGrid message ID captured.", type: "success" },
        { node: "end", log: "Client Intake Workflow complete. Status promoted to 'active'.", type: "success" }
      ]
    }
  },
  order: {
    title: "Order Entity",
    icon: "🛒",
    category: "Commercial",
    desc: "Generic sales transaction order representing items purchased, net pricing totals, payment details, and fulfillment state.",
    flowTitle: "Order Fulfillment Workflow",
    flowDesc: "Queries product databases, captures credit card payments, alerts warehouse packaging, and delivers shipping confirmation.",
    schema: [
      { name: "id", type: "string", desc: "Unique transaction identifier.", constraints: "UUID, Primary Key" },
      { name: "client_id", type: "string", desc: "Reference ID of purchasing client entity.", constraints: "Required, Foreign Key -> clients.id" },
      { name: "order_date", type: "date", desc: "Timestamp when order was finalized.", constraints: "Required" },
      { name: "total_amount", type: "number", desc: "Net order dollar amount value.", constraints: "Required, Min 0.00" },
      { name: "items", type: "json", desc: "Item list array containing skus, quantities, and pricing.", constraints: "Required, Array content" },
      { name: "status", type: "string", desc: "Order execution status.", constraints: "ENUM (pending, paid, shipped, complete, cancelled)" },
      { name: "payment_method", type: "string", desc: "Credit card, transfer, or invoice mechanism.", constraints: "Required, ENUM" }
    ],
    bpmn: {
      nodes: [
        { id: "start", type: "start", label: "Order Placed", position: { x: 50, y: 120 } },
        { id: "inv_check", type: "webhook", label: "Inventory Check", position: { x: 180, y: 90 }, url: "https://api.erp.internal/v1/inventory/verify", inputs: "items", outputs: "in_stock", details: "Fires backend API queries to verify matching skus and quantities are in stock." },
        { id: "stock_gate", type: "gateway", label: "In Stock?", position: { x: 370, y: 100 }, condition: "inv_check.in_stock == true", details: "Conditional checkout gate verifying stock levels before processing payments." },
        { id: "pay_process", type: "webhook", label: "Charge Card", position: { x: 500, y: 90 }, url: "https://api.stripe.com/v1/charges", inputs: "total_amount, token", outputs: "charge_id, success", details: "Submits transaction parameters to payment processor endpoints." },
        { id: "warehouse_pack", type: "user_input", label: "Pack & Label", position: { x: 690, y: 90 }, assignee: "Fulfillment Operative", inputs: "items, shipping_address", outputs: "tracking_code", details: "Creates warehouse inventory picker alerts, packages matching parts, and affixes carrier labels." },
        { id: "email_tracking", type: "webhook", label: "Email Tracking", position: { x: 880, y: 90 }, url: "https://api.postmarkapp.com/email", inputs: "email, tracking_code", outputs: "email_sent", details: "Sends automated order delivery updates and links to parcel status dashboards." },
        { id: "end", type: "end", label: "Complete", position: { x: 1070, y: 120 } }
      ],
      edges: [
        { id: "e-start-inv", source: "start", target: "inv_check" },
        { id: "e-inv-gate", source: "inv_check", target: "stock_gate" },
        { id: "e-gate-pay", source: "stock_gate", target: "pay_process" },
        { id: "e-pay-pack", source: "pay_process", target: "warehouse_pack" },
        { id: "e-pack-mail", source: "warehouse_pack", target: "email_tracking" },
        { id: "e-mail-end", source: "email_tracking", target: "end" }
      ],
      steps: [
        { node: "start", log: "Sales Order processing initialized...", type: "system" },
        { node: "inv_check", log: "Webhook triggered: Checking warehouse stock status in interior ERP databases...", type: "info" },
        { node: "inv_check", log: "Inventory matched. Stock status: 'true'.", type: "success" },
        { node: "stock_gate", log: "Conditional evaluated: inv_check.in_stock == true (satisfied). Proceeding.", type: "system" },
        { node: "pay_process", log: "Webhook triggered: Capture transaction authorization via Stripe...", type: "info" },
        { node: "pay_process", log: "Transaction authorization complete: charge_id 'ch_90218_auth' capture successful.", type: "success" },
        { node: "warehouse_pack", log: "Fulfillment Operative: Packing items and printing shipping waybill labels...", type: "info" },
        { node: "warehouse_pack", log: "Package prepared. Carrier tracking number registered: '1Z-999-AA1-01-2345'.", type: "success" },
        { node: "email_tracking", log: "Webhook triggered: Broadcasting tracking keys to purchaser inbox...", type: "info" },
        { node: "email_tracking", log: "Notification successfully processed by SMTP relay.", type: "success" },
        { node: "end", log: "Order fulfillment complete. Order status updated to 'shipped'.", type: "success" }
      ]
    }
  },
  ledger: {
    title: "Ledger Entity",
    icon: "📒",
    category: "Financials",
    desc: "Financial ledger database rows recording accounting entries, descriptions, debits, and credits complying with double-entry principles.",
    flowTitle: "Ledger Reconciliation Flow",
    flowDesc: "Aggregates bank statements, executes automated match validation formulas, registers adjustments, and locks accounts.",
    schema: [
      { name: "id", type: "string", desc: "Unique ledger item line index.", constraints: "UUID, Primary Key" },
      { name: "transaction_date", type: "date", desc: "Double-entry bookkeeping journal date.", constraints: "Required" },
      { name: "account_code", type: "string", desc: "Target chart of accounts category code.", constraints: "Required, matches CoA format" },
      { name: "description", type: "string", desc: "Transaction memo detailing purchase context.", constraints: "Required, max 250 chars" },
      { name: "debit", type: "number", desc: "Debit allocation value.", constraints: "Min 0.00, mutually exclusive with credit" },
      { name: "credit", type: "number", desc: "Credit allocation value.", constraints: "Min 0.00, mutually exclusive with debit" },
      { name: "created_by", type: "string", desc: "Corporate credentials posting transaction.", constraints: "Required" }
    ],
    bpmn: {
      nodes: [
        { id: "start", type: "start", label: "Period Closed", position: { x: 50, y: 120 } },
        { id: "fetch_txns", type: "webhook", label: "Fetch Statements", position: { x: 180, y: 90 }, url: "https://api.plaid.com/v2/transactions/get", inputs: "account_ids, start_date", outputs: "transactions", details: "Downloads official banking statements via Plaid transaction matching APIs." },
        { id: "auto_match", type: "webhook", label: "Run Matcher", position: { x: 370, y: 90 }, url: "https://api.reconcile.internal/v1/match", inputs: "transactions, ledger_lines", outputs: "match_rate, unmapped_count", details: "Runs rule-based fuzzy matching algorithms correlating ledger codes with bank entries." },
        { id: "match_gate", type: "gateway", label: "100% Match?", position: { x: 560, y: 100 }, condition: "auto_match.unmapped_count == 0", details: "Conditional gate checking if all bank statements reconciliated automatically." },
        { id: "manual_rev", type: "user_input", label: "Review Exceptions", position: { x: 700, y: 90 }, assignee: "Senior Accountant", inputs: "unmapped_transactions", outputs: "posted_adjustments", details: "Creates accountant exceptions reviews queues to correlate unmapped invoices manually." },
        { id: "post_adjust", type: "webhook", label: "Post Adjustments", position: { x: 890, y: 90 }, url: "https://api.ledger.internal/v1/adjust", inputs: "posted_adjustments", outputs: "ledger_updated", details: "Commits adjust items back into journal ledgers to resolve exceptions." },
        { id: "close_period", type: "webhook", label: "Lock Books", position: { x: 1080, y: 90 }, url: "https://api.ledger.internal/v1/period/lock", inputs: "period_id", outputs: "status", details: "Locks accounting periods preventing further posts and generating ledger exports." },
        { id: "end", type: "end", label: "Reconciled", position: { x: 1270, y: 120 } }
      ],
      edges: [
        { id: "e-start-fetch", source: "start", target: "fetch_txns" },
        { id: "e-fetch-match", source: "fetch_txns", target: "auto_match" },
        { id: "e-match-gate", source: "auto_match", target: "match_gate" },
        { id: "e-gate-rev", source: "match_gate", target: "manual_rev" },
        { id: "e-rev-post", source: "manual_rev", target: "post_adjust" },
        { id: "e-post-close", source: "post_adjust", target: "close_period" },
        { id: "e-close-end", source: "close_period", target: "end" }
      ],
      steps: [
        { node: "start", log: "Ledger monthly reconciliation process started...", type: "system" },
        { node: "fetch_txns", log: "Webhook triggered: pulling bank transaction statements via Plaid interface...", type: "info" },
        { node: "fetch_txns", log: "Statement fetch completed: parsed 42 ledger entries.", type: "success" },
        { node: "auto_match", log: "Webhook triggered: checking bank statements against records...", type: "info" },
        { node: "auto_match", log: "Reconciliation match complete. Unmapped count: 3 entries.", type: "warning" },
        { node: "match_gate", log: "Evaluating conditions: auto_match.unmapped_count == 0 (unmet). Routing to exceptions.", type: "system" },
        { node: "manual_rev", log: "Senior Accountant: resolving remaining bank mismatch entries...", type: "info" },
        { node: "manual_rev", log: "Accountant manually mapped remaining 3 statements to chart accounts.", type: "success" },
        { node: "post_adjust", log: "Webhook triggered: registering correction ledger posts...", type: "info" },
        { node: "post_adjust", log: "Adjustment posts completed. Accounting records verified.", type: "success" },
        { node: "close_period", log: "Webhook triggered: sealing period books...", type: "info" },
        { node: "close_period", log: "Lock complete. Period sealed against editing.", type: "success" },
        { node: "end", log: "Ledger reconciliation flow completed successfully.", type: "success" }
      ]
    }
  }
};

/* ------------------------------------------------------------------ *
 * 4. React Workbench Main Component (Type.js + React Flow)
 * ------------------------------------------------------------------ */
function SchemaWorkbench() {
  const [loadingWorkbench, setLoadingWorkbench] = useState(true);
  const [activeEntityKey, setActiveEntityKey] = useState('employee');
  const [activeTab, setActiveTab] = useState('schema'); // 'schema' | 'designer' | 'bpmn'
  const [entities, setEntities] = useState({});
  const [relationships, setRelationships] = useState([]);

  useEffect(() => {
    fetch('/api/workbench')
      .then(res => {
        if (!res.ok) throw new Error("Failed to load workbench data");
        return res.json();
      })
      .then(data => {
        setEntities(data.entities || {});
        setRelationships(data.relationships || []);
        setLoadingWorkbench(false);
      })
      .catch(err => {
        console.error("Failed to load workbench data from server:", err);
        setLoadingWorkbench(false);
      });
  }, []);

  const saveWorkbench = (nextEntities, nextRelationships) => {
    fetch('/api/workbench', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ entities: nextEntities, relationships: nextRelationships })
    })
    .then(res => {
      if (!res.ok) throw new Error("Failed to save workbench updates to server");
      return res.json();
    })
    .catch(err => {
      console.error("Workbench Sync Error:", err);
    });
  };
  
  // Row-level Visual Editing state
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [toggleJson, setToggleJson] = useState(false);
  
  // LLM Schema Assistant State
  const [llmPrompt, setLlmPrompt] = useState("");
  const [llmWorking, setLlmWorking] = useState(false);

  // Inspector Panel State
  const [selectedElement, setSelectedElement] = useState(null);

  // React Flow state bindings for Tab 3 (BPMN Workflow)
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // React Flow state bindings for Tab 2 (Schema Designer ERD relationships)
  const [erdNodes, setErdNodes, onErdNodesChange] = useNodesState([]);
  const [erdEdges, setErdEdges, onErdEdgesChange] = useEdgesState([]);

  // Sidebar Entity Creator modal state
  const [showAddEntityModal, setShowAddEntityModal] = useState(false);
  const [newEntName, setNewEntName] = useState("");
  const [newEntCategory, setNewEntCategory] = useState("Commercial");
  const [newEntIcon, setNewEntIcon] = useState("📦");
  const [newEntDesc, setNewEntDesc] = useState("");

  // Toolbar relationship selector states
  const [relSource, setRelSource] = useState("client");
  const [relTarget, setRelTarget] = useState("order");
  const [relType, setRelType] = useState("one-to-many");

  // Simulation State Engine
  const [simStatus, setSimStatus] = useState('idle');
  const [simLogs, setSimLogs] = useState([]);
  const simNodeIndexRef = useRef(-1);
  const simIntervalRef = useRef(null);

  const activeEntityData = entities[activeEntityKey];

  // Helper to add logs to console
  const addLog = useCallback((message, type = 'info') => {
    const time = new Date();
    const ts = `[${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}] `;
    setSimLogs(prev => [...prev, { ts, text: message, type }]);
  }, []);

  // Recalculate JSON Schema object in real-time
  const getJsonSchema = () => {
    if (!activeEntityData) return {};
    const properties = {};
    const required = [];

    activeEntityData.schema.forEach(f => {
      let schemaType = "string";
      let extra = {};

      if (f.type === "number") schemaType = "number";
      else if (f.type === "boolean") schemaType = "boolean";
      else if (f.type === "json") schemaType = "object";

      const constraintsLower = f.constraints.toLowerCase();
      if (constraintsLower.includes("required")) {
        required.push(f.name);
      }
      if (constraintsLower.includes("uuid")) {
        extra.format = "uuid";
      }
      if (constraintsLower.includes("email")) {
        extra.format = "email";
      }
      if (constraintsLower.includes("date")) {
        extra.format = "date";
      }

      properties[f.name] = {
        type: schemaType,
        description: f.desc,
        ...extra
      };
    });

    const generated = {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "title": activeEntityKey.charAt(0).toUpperCase() + activeEntityKey.slice(1),
      "type": "object",
      "properties": properties
    };

    if (required.length > 0) {
      generated.required = required;
    }

    return generated;
  };

  // Sync React Flow nodes & edges when switching entities or simulation changes (BPMN tab)
  const rebuildFlowDiagram = useCallback((activeSimNodeId = null, animatedEdges = []) => {
    if (!activeEntityData) return;
    const flowNodes = activeEntityData.bpmn.nodes.map(n => {
      const isSelected = selectedElement && selectedElement.category === 'bpmn' && selectedElement.id === n.id;
      return {
        id: n.id,
        type: n.type,
        position: n.position,
        data: { 
          label: n.label, 
          isActive: n.id === activeSimNodeId,
          isSelected: !!isSelected
        }
      };
    });

    const flowEdges = activeEntityData.bpmn.edges.map(e => {
      const isPathActive = animatedEdges.includes(e.id);
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        animated: isPathActive,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isPathActive ? '#22c55e' : 'rgba(255, 255, 255, 0.2)',
          width: 14,
          height: 14
        },
        style: {
          stroke: isPathActive ? '#22c55e' : 'rgba(255, 255, 255, 0.15)',
          strokeWidth: isPathActive ? 2.5 : 1.5
        }
      };
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [activeEntityData, selectedElement]);

  // Sync ERD Diagram canvas (Schema Designer tab)
  const rebuildErdDiagram = useCallback(() => {
    // Generate nodes for all active entities in state, laying them out in a clean grid layout
    const keys = Object.keys(entities);
    const layoutPositions = [
      { x: 50, y: 50 },
      { x: 380, y: 50 },
      { x: 50, y: 400 },
      { x: 380, y: 400 },
      { x: 710, y: 220 },
      { x: 710, y: 50 },
      { x: 710, y: 400 }
    ];

    const flowNodes = keys.map((key, index) => {
      const ent = entities[key];
      const isSelected = selectedElement && selectedElement.category === 'erd' && selectedElement.key === key;
      const position = layoutPositions[index] || { x: 50 + (index * 150), y: 200 };
      
      return {
        id: key,
        type: 'erd',
        position: position,
        data: {
          title: ent.title,
          category: ent.category,
          icon: ent.icon,
          fields: ent.schema,
          isSelected: !!isSelected
        }
      };
    });

    // Generate edges for all defined relationships
    const flowEdges = relationships.map(r => {
      const isSelected = selectedElement && selectedElement.category === 'relationship' && selectedElement.id === r.id;
      
      let labelText = "1 : 1";
      if (r.type === 'one-to-many') labelText = "1 : N";
      else if (r.type === 'many-to-one') labelText = "N : 1";
      else if (r.type === 'many-to-many') labelText = "N : M";

      return {
        id: r.id,
        source: r.source,
        target: r.target,
        style: {
          stroke: isSelected ? '#06b6d4' : 'rgba(255, 255, 255, 0.25)',
          strokeWidth: isSelected ? 3.5 : 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isSelected ? '#06b6d4' : 'rgba(255, 255, 255, 0.3)',
          width: 12,
          height: 12
        },
        label: labelText,
        labelStyle: { fill: '#ffffff', fontWeight: 600, fontSize: 10 },
        labelBgPadding: [4, 4],
        labelBgBorderRadius: 4,
        labelBgStyle: { fill: '#1e293b', fillOpacity: 0.85, stroke: 'rgba(255,255,255,0.08)' }
      };
    });

    setErdNodes(flowNodes);
    setErdEdges(flowEdges);
  }, [entities, relationships, selectedElement]);

  useEffect(() => {
    if (activeTab === 'bpmn') {
      rebuildFlowDiagram();
    } else if (activeTab === 'designer') {
      rebuildErdDiagram();
    }
  }, [activeTab, activeEntityKey, entities, relationships, rebuildFlowDiagram, rebuildErdDiagram]);

  // Handle visual Type.js Visual Grid row edits
  const handleFieldChange = (index, key, value) => {
    const nextEntities = { ...entities };
    const fieldsCopy = [...nextEntities[activeEntityKey].schema];
    fieldsCopy[index] = { ...fieldsCopy[index], [key]: value };
    nextEntities[activeEntityKey] = { ...nextEntities[activeEntityKey], schema: fieldsCopy };
    setEntities(nextEntities);
    saveWorkbench(nextEntities, relationships);
  };

  const handleAddField = () => {
    const nextEntities = { ...entities };
    const fieldsCopy = [...nextEntities[activeEntityKey].schema];
    fieldsCopy.push({ 
      name: `new_field_${fieldsCopy.length + 1}`, 
      type: "string", 
      desc: "Custom schema property.", 
      constraints: "Optional" 
    });
    nextEntities[activeEntityKey] = { ...nextEntities[activeEntityKey], schema: fieldsCopy };
    setEntities(nextEntities);
    saveWorkbench(nextEntities, relationships);
    // Immediately place the newly added field in edit mode
    setEditingRowIndex(activeEntityData.schema.length);
  };

  const handleDeleteField = (index) => {
    const nextEntities = { ...entities };
    const fieldsCopy = nextEntities[activeEntityKey].schema.filter((_, i) => i !== index);
    nextEntities[activeEntityKey] = { ...nextEntities[activeEntityKey], schema: fieldsCopy };
    setEntities(nextEntities);
    saveWorkbench(nextEntities, relationships);
    if (editingRowIndex === index) {
      setEditingRowIndex(null);
    } else if (editingRowIndex > index) {
      setEditingRowIndex(prev => prev - 1);
    }
    if (selectedElement && selectedElement.category === 'schema') {
      setSelectedElement(null);
    }
  };

  // Add a newly defined Entity via Sidebar Modal Form
  const handleAddEntitySubmit = (e) => {
    e.preventDefault();
    if (!newEntName.trim()) return;

    const key = newEntName.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (entities[key]) {
      alert("An entity with this identifier name already exists!");
      return;
    }

    const newEntityObj = {
      title: newEntName.trim() + " Entity",
      icon: newEntIcon,
      category: newEntCategory,
      desc: newEntDesc.trim() || `Schema definition and process maps for ${newEntName}.`,
      flowTitle: `${newEntName} Process Flow`,
      flowDesc: `Workflow engine definition tracking ${newEntName} processes.`,
      schema: [
        { name: "id", type: "string", desc: "Unique record identifier.", constraints: "Required, UUID, Primary Key" }
      ],
      bpmn: {
        nodes: [
          { id: "start", type: "start", label: "Start", position: { x: 50, y: 120 } },
          { id: "end", type: "end", label: "End", position: { x: 320, y: 120 } }
        ],
        edges: [
          { id: "e-start-end", source: "start", target: "end" }
        ],
        steps: [
          { node: "start", log: `${newEntName} process initiated.`, type: "system" },
          { node: "end", log: `${newEntName} process completed.`, type: "success" }
        ]
      }
    };

    const nextEntities = { ...entities, [key]: newEntityObj };
    setEntities(nextEntities);
    saveWorkbench(nextEntities, relationships);
    setActiveEntityKey(key);
    setShowAddEntityModal(false);
    
    // Reset form states
    setNewEntName("");
    setNewEntCategory("Commercial");
    setNewEntIcon("📦");
    setNewEntDesc("");
  };

  // Create a new relationship line in Schema Designer
  const handleAddRelationship = (e) => {
    e.preventDefault();
    if (relSource === relTarget) {
      alert("Source and Target entities must be different!");
      return;
    }
    
    const id = `rel-${relSource}-${relTarget}-${Date.now()}`;
    const exists = relationships.some(r => r.source === relSource && r.target === relTarget);
    if (exists) {
      alert("A relationship from this source to target already exists!");
      return;
    }

    const nextRelationships = [...relationships, { id, source: relSource, target: relTarget, type: relType }];
    setRelationships(nextRelationships);
    saveWorkbench(entities, nextRelationships);
    addLog(`System: Established relationship [${entities[relSource].title.split(' ')[0]} ➔ ${entities[relTarget].title.split(' ')[0]}] (${relType}).`, "system");
  };

  // Delete a relationship link
  const handleDeleteRelationship = (relId) => {
    const nextRelationships = relationships.filter(r => r.id !== relId);
    setRelationships(nextRelationships);
    saveWorkbench(entities, nextRelationships);
    setSelectedElement(null);
    addLog("System: Deleted selected relationship line from diagram.", "system");
  };

  // LLM Prompt assistant integration
  const handleLlmSubmit = async (e) => {
    e.preventDefault();
    if (!llmPrompt.trim()) return;

    setLlmWorking(true);
    addLog(`LLM Assistant: Modifying schema structure for "${llmPrompt}"...`, "info");
    
    await new Promise(resolve => setTimeout(resolve, 800));

    const promptText = llmPrompt.toLowerCase();
    let additions = [];

    if (promptText.includes("address")) {
      additions = [
        { name: "billing_street", type: "string", desc: "Corporate billing street line.", constraints: "Required" },
        { name: "billing_city", type: "string", desc: "Billing city destination.", constraints: "Required" },
        { name: "billing_zip", type: "string", desc: "Billing ZIP postal code.", constraints: "Required" }
      ];
      addLog("LLM Assistant: Appending billing address structures.", "success");
    } else if (promptText.includes("phone") || promptText.includes("tele") || promptText.includes("contact")) {
      additions = [
        { name: "contact_number", type: "string", desc: "Mobile contact digits.", constraints: "E.164 format" },
        { name: "notes", type: "string", desc: "Contact journal comments.", constraints: "Optional" }
      ];
      addLog("LLM Assistant: Appending communication fields.", "success");
    } else if (promptText.includes("audit") || promptText.includes("meta") || promptText.includes("track")) {
      additions = [
        { name: "created_at", type: "date", desc: "Row creation timestamp.", constraints: "Required" },
        { name: "updated_at", type: "date", desc: "Modification timestamp.", constraints: "Required" },
        { name: "created_by", type: "string", desc: "Author identity.", constraints: "Required" }
      ];
      addLog("LLM Assistant: Appending database metadata fields.", "success");
    } else {
      const words = llmPrompt.trim().split(" ");
      let cleanName = words[words.length - 1].toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (cleanName.length < 2) cleanName = "ai_field";
      additions = [
        { name: cleanName, type: "string", desc: `Custom field drafted for: "${llmPrompt}"`, constraints: "Optional" }
      ];
      addLog(`LLM Assistant: Appended generated variable: "${cleanName}".`, "success");
    }

    await new Promise(resolve => setTimeout(resolve, 400));
    const nextEntities = { ...entities };
    const fieldsCopy = [...nextEntities[activeEntityKey].schema];
    const names = additions.map(a => a.name);
    const filtered = fieldsCopy.filter(f => !names.includes(f.name));
    nextEntities[activeEntityKey] = { ...nextEntities[activeEntityKey], schema: [...filtered, ...additions] };
    setEntities(nextEntities);
    saveWorkbench(nextEntities, relationships);

    setLlmPrompt("");
    setLlmWorking(false);
  };

  // Inspect React Flow node elements
  const onNodeClick = (event, clickedNode) => {
    const nodeDetails = activeEntityData.bpmn.nodes.find(n => n.id === clickedNode.id);
    if (nodeDetails) {
      setSelectedElement({
        category: 'bpmn',
        title: nodeDetails.label,
        type: 'BPMN ' + nodeDetails.type.toUpperCase() + ' Node',
        id: nodeDetails.id,
        assignee: nodeDetails.assignee,
        url: nodeDetails.url,
        condition: nodeDetails.condition,
        inputs: nodeDetails.inputs,
        outputs: nodeDetails.outputs,
        details: nodeDetails.details
      });
      
      setNodes(prev => prev.map(n => ({
        ...n,
        data: {
          ...n.data,
          isSelected: n.id === clickedNode.id
        }
      })));
    }
  };

  const onNodeDragStop = (event, node) => {
    const nextEntities = { ...entities };
    const nodeIndex = nextEntities[activeEntityKey].bpmn.nodes.findIndex(n => n.id === node.id);
    if (nodeIndex !== -1) {
      nextEntities[activeEntityKey].bpmn.nodes[nodeIndex].position = node.position;
      setEntities(nextEntities);
      saveWorkbench(nextEntities, relationships);
    }
  };

  // Inspect Schema Designer ERD node elements
  const onErdNodeClick = (event, clickedNode) => {
    const ent = entities[clickedNode.id];
    if (ent) {
      setSelectedElement({
        category: 'erd',
        key: clickedNode.id,
        title: ent.title,
        type: 'ERD Database Entity',
        icon: ent.icon,
        categoryName: ent.category,
        desc: ent.desc,
        fieldsCount: ent.schema.length
      });

      setErdNodes(prev => prev.map(n => ({
        ...n,
        data: {
          ...n.data,
          isSelected: n.id === clickedNode.id
        }
      })));
    }
  };

  // Inspect Schema Designer edge elements
  const onErdEdgeClick = (event, clickedEdge) => {
    const rel = relationships.find(r => r.id === clickedEdge.id);
    if (rel) {
      setSelectedElement({
        category: 'relationship',
        id: rel.id,
        title: `${entities[rel.source].title.split(' ')[0]} ➔ ${entities[rel.target].title.split(' ')[0]}`,
        type: 'Entity Relationship Connection',
        source: rel.source,
        target: rel.target,
        relationType: rel.type
      });
    }
  };

  // Simulation stepping timers
  const executeSimulationStep = useCallback(() => {
    const steps = activeEntityData.bpmn.steps;
    simNodeIndexRef.current++;

    if (simNodeIndexRef.current >= steps.length) {
      clearInterval(simIntervalRef.current);
      setSimStatus('finished');
      addLog("--- Simulation Run Finished Successfully ---", "success");
      return;
    }

    const currentStep = steps[simNodeIndexRef.current];
    addLog(currentStep.log, currentStep.type);

    const activeNodeId = currentStep.node;
    const activeEdges = [];

    if (simNodeIndexRef.current > 0) {
      const lastNodeId = steps[simNodeIndexRef.current - 1].node;
      const matchEdge = activeEntityData.bpmn.edges.find(e => e.source === lastNodeId && e.target === activeNodeId);
      if (matchEdge) {
        activeEdges.push(matchEdge.id);
      } else {
        const fallEdge = activeEntityData.bpmn.edges.find(e => e.target === activeNodeId);
        if (fallEdge) activeEdges.push(fallEdge.id);
      }
    }

    rebuildFlowDiagram(activeNodeId, activeEdges);

    const activeNodeData = activeEntityData.bpmn.nodes.find(n => n.id === activeNodeId);
    if (activeNodeData) {
      setSelectedElement({
        category: 'bpmn',
        title: activeNodeData.label,
        type: 'BPMN ' + activeNodeData.type.toUpperCase() + ' Node',
        id: activeNodeData.id,
        assignee: activeNodeData.assignee,
        url: activeNodeData.url,
        condition: activeNodeData.condition,
        inputs: activeNodeData.inputs,
        outputs: activeNodeData.outputs,
        details: activeNodeData.details
      });
    }

  }, [activeEntityKey, entities, addLog, rebuildFlowDiagram]);

  const startSimulation = () => {
    resetSimulation();
    setSimStatus('running');
    setSimLogs([]);
    simNodeIndexRef.current = -1;

    executeSimulationStep();
    simIntervalRef.current = setInterval(executeSimulationStep, 1650);
  };

  const resetSimulation = () => {
    clearInterval(simIntervalRef.current);
    simIntervalRef.current = null;
    simNodeIndexRef.current = -1;
    setSimStatus('idle');
    setSimLogs([]);
    rebuildFlowDiagram();
  };

  const copyJsonSchema = () => {
    navigator.clipboard.writeText(JSON.stringify(getJsonSchema(), null, 2)).then(() => {
      addLog("System: Copied raw JSON Schema to clipboard.", "system");
    });
  };

  // Group entities in the sidebar by their category
  const categories = {};
  Object.keys(entities).forEach(key => {
    const ent = entities[key];
    if (!categories[ent.category]) {
      categories[ent.category] = [];
    }
    categories[ent.category].push({ key, ...ent });
  });

  if (loadingWorkbench) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '1.5rem', flex: 1 }}>
        <div className="sim-pulse-glow" style={{ width: '60px', height: '60px', borderRadius: '50%', border: '4px solid rgba(6,182,212,0.1)', borderTopColor: '#06b6d4', animation: 'spin 1.2s linear infinite' }} />
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', letterSpacing: '0.05em' }}>Loading workspace database...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="workbench-container" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      
      {/* 1. Left Pane: Grouped Sidebar + Entity Creator button */}
      <aside className="sidebar-pane" aria-label="Entities Selection" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 className="pane-title" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>Entities</h3>
          
          {Object.keys(categories).map(catName => (
            <div key={catName} className="category-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <h4 className="category-group-header" style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.2rem 0' }}>
                {catName}
              </h4>
              <div className="entity-list" role="tablist">
                {categories[catName].map(ent => {
                  const isActive = ent.key === activeEntityKey;
                  return (
                    <button
                      key={ent.key}
                      type="button"
                      className={`entity-card ${isActive ? 'is-active' : ''}`}
                      onClick={() => {
                        setActiveEntityKey(ent.key);
                        setEditingRowIndex(null);
                      }}
                      role="tab"
                      aria-selected={isActive ? 'true' : 'false'}
                    >
                      <div className="entity-card-header">
                        <span className="entity-icon" aria-hidden="true">{ent.icon}</span>
                        <span className="entity-name">{ent.title.split(' ')[0]}</span>
                      </div>
                      <p className="entity-desc">{ent.desc.substring(0, 42)}...</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar add entity trigger */}
        <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button 
            type="button" 
            className="btn-sim primary" 
            style={{ width: '100%', padding: '0.6rem 0' }}
            onClick={() => setShowAddEntityModal(true)}
          >
            + Create New Entity
          </button>
        </div>
      </aside>

      {/* 2. Middle Pane: Workspace */}
      <main className="workspace-pane">
        <div className="workspace-header">
          <div className="workspace-title-area">
            <h2>{activeEntityData.title}</h2>
            <p>{activeEntityData.desc}</p>
          </div>
          <div className="workspace-tabs" role="tablist">
            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'schema' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('schema')}
              role="tab"
              aria-selected={activeTab === 'schema' ? 'true' : 'false'}
            >
              Entity Definition
            </button>
            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'designer' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('designer')}
              role="tab"
              aria-selected={activeTab === 'designer' ? 'true' : 'false'}
            >
              Schema Designer (ERD)
            </button>
            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'bpmn' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('bpmn')}
              role="tab"
              aria-selected={activeTab === 'bpmn' ? 'true' : 'false'}
            >
              BPMN
            </button>
          </div>
        </div>

        <div className="workspace-content">
          
          {/* TAB 1: Entity Definition (Type.js visual grid) */}
          {activeTab === 'schema' && (
            <section className="content-panel is-active" role="tabpanel">
              <div className="schema-view-controls">
                <button type="button" className="btn-toggle-json" onClick={() => setToggleJson(!toggleJson)}>
                  {toggleJson ? "Hide JSON Schema" : "View JSON Schema"}
                </button>
              </div>

              {/* Read-only visual grid with Pencil edit toggles */}
              <div className="schema-table-wrap">
                <table className="schema-table">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '22%' }}>Field Variable</th>
                      <th scope="col" style={{ width: '18%' }}>Data Type</th>
                      <th scope="col" style={{ width: '38%' }}>Description</th>
                      <th scope="col" style={{ width: '15%' }}>Constraints</th>
                      <th scope="col" style={{ width: '7%', textAlign: 'center' }}>Edit / Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEntityData.schema.map((field, idx) => {
                      const isEditing = idx === editingRowIndex;
                      return (
                        <tr 
                          key={idx} 
                          onClick={() => setSelectedElement({
                            category: 'schema',
                            title: field.name,
                            type: 'Schema Field Variable',
                            name: field.name,
                            dataType: field.type,
                            desc: field.desc,
                            constraints: field.constraints
                          })}
                          style={{ background: selectedElement && selectedElement.category === 'schema' && selectedElement.title === field.name ? 'rgba(6, 182, 212, 0.08)' : '' }}
                        >
                          {isEditing ? (
                            <>
                              <td>
                                <input
                                  type="text"
                                  value={field.name}
                                  onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                                  className="wysiwyg-field-input name"
                                  aria-label="field name"
                                />
                              </td>
                              <td>
                                <select
                                  value={field.type}
                                  onChange={(e) => handleFieldChange(idx, 'type', e.target.value)}
                                  className="wysiwyg-field-select"
                                  aria-label="field type"
                                >
                                  <option value="string">string</option>
                                  <option value="number">number</option>
                                  <option value="date">date</option>
                                  <option value="json">json</option>
                                  <option value="boolean">boolean</option>
                                </select>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={field.desc}
                                  onChange={(e) => handleFieldChange(idx, 'desc', e.target.value)}
                                  className="wysiwyg-field-input desc"
                                  aria-label="field description"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={field.constraints}
                                  onChange={(e) => handleFieldChange(idx, 'constraints', e.target.value)}
                                  className="wysiwyg-field-input constraints"
                                  aria-label="field constraints"
                                />
                              </td>
                              <td style={{ textAlign: 'center', display: 'flex', gap: '0.4rem', justifyContent: 'center', borderBottom: '0' }}>
                                <button
                                  type="button"
                                  className="btn-wysiwyg-delete"
                                  style={{ color: '#4ade80', opacity: 1 }}
                                  onClick={(e) => { e.stopPropagation(); setEditingRowIndex(null); }}
                                  title="Save field"
                                  aria-label="Save field"
                                >
                                  ✓
                                </button>
                                <button 
                                  type="button" 
                                  className="btn-wysiwyg-delete" 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteField(idx); }}
                                  title="Delete field"
                                  aria-label="Delete field"
                                >
                                  ✕
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td><span className="field-name-code">{field.name}</span></td>
                              <td><span className={`type-badge ${field.type}`}>{field.type}</span></td>
                              <td>{field.desc}</td>
                              <td><span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{field.constraints}</span></td>
                              <td style={{ textAlign: 'center', display: 'flex', gap: '0.4rem', justifyContent: 'center', borderBottom: '0' }}>
                                <button
                                  type="button"
                                  className="btn-wysiwyg-delete"
                                  style={{ color: '#06b6d4' }}
                                  onClick={(e) => { e.stopPropagation(); setEditingRowIndex(idx); }}
                                  title="Edit row"
                                  aria-label="Edit row"
                                >
                                  ✏️
                                </button>
                                <button 
                                  type="button" 
                                  className="btn-wysiwyg-delete" 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteField(idx); }}
                                  title="Delete field"
                                  aria-label="Delete field"
                                >
                                  ✕
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ padding: '0.8rem 1.2rem', background: 'rgba(30, 41, 59, 0.3)' }}>
                  <button type="button" className="btn-sim primary" onClick={handleAddField}>+ Add Variable Field</button>
                </div>
              </div>

              {/* LLM Assistant Prompt */}
              <div className="simulation-panel" style={{ marginTop: '0.5rem', background: 'rgba(15, 23, 42, 0.4)' }}>
                <div className="sim-status" style={{ marginBottom: '0.6rem' }}>
                  <span className="status-dot active" style={{ background: llmWorking ? '#22c55e' : '#64748b' }}></span>
                  <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>LLM Schema Assistant</span>
                </div>
                <form onSubmit={handleLlmSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Ask AI to modify schema (e.g., 'Add audit metadata tracking fields')"
                    value={llmPrompt}
                    onChange={(e) => setLlmPrompt(e.target.value)}
                    className="wysiwyg-field-input"
                    style={{ flex: 1, background: 'rgba(0, 0, 0, 0.3)' }}
                    disabled={llmWorking}
                  />
                  <button type="submit" className="btn-sim primary" style={{ whiteSpace: 'nowrap' }} disabled={llmWorking}>
                    {llmWorking ? "Thinking..." : "Ask AI"}
                  </button>
                </form>
              </div>

              {/* Toggleable JSON block preview */}
              {toggleJson && (
                <div className="json-schema-panel is-visible" style={{ marginTop: '1rem' }}>
                  <div className="json-header-bar">
                    <span className="json-title">Visual JSON Schema Spec Preview</span>
                    <button type="button" className="btn-copy-json" onClick={copyJsonSchema}>Copy Schema</button>
                  </div>
                  <pre className="json-code-block">
                    <code>{JSON.stringify(getJsonSchema(), null, 2)}</code>
                  </pre>
                </div>
              )}
            </section>
          )}

          {/* TAB 2: Schema Designer (ERD Relationships visualizer) */}
          {activeTab === 'designer' && (
            <section className="content-panel is-active" role="tabpanel">
              <div className="bpmn-view-container">
                
                {/* ERD Relationship mapping selectors */}
                <div className="simulation-panel" style={{ margin: '0 0 1rem 0', background: 'rgba(15, 23, 42, 0.4)' }}>
                  <form onSubmit={handleAddRelationship} style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label htmlFor="rel-source-select" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Source Entity:</label>
                      <select 
                        id="rel-source-select"
                        value={relSource} 
                        onChange={(e) => setRelSource(e.target.value)}
                        className="wysiwyg-field-select"
                        style={{ width: '130px', padding: '0.35rem 0.6rem' }}
                      >
                        {Object.keys(entities).map(key => (
                          <option key={key} value={key}>{entities[key].title.split(' ')[0]}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label htmlFor="rel-type-select" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Relationship:</label>
                      <select 
                        id="rel-type-select"
                        value={relType} 
                        onChange={(e) => setRelType(e.target.value)}
                        className="wysiwyg-field-select"
                        style={{ width: '150px', padding: '0.35rem 0.6rem' }}
                      >
                        <option value="one-to-one">one-to-one (1:1)</option>
                        <option value="one-to-many">one-to-many (1:N)</option>
                        <option value="many-to-one">many-to-one (N:1)</option>
                        <option value="many-to-many">many-to-many (N:M)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label htmlFor="rel-target-select" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Target Entity:</label>
                      <select 
                        id="rel-target-select"
                        value={relTarget} 
                        onChange={(e) => setRelTarget(e.target.value)}
                        className="wysiwyg-field-select"
                        style={{ width: '130px', padding: '0.35rem 0.6rem' }}
                      >
                        {Object.keys(entities).map(key => (
                          <option key={key} value={key}>{entities[key].title.split(' ')[0]}</option>
                        ))}
                      </select>
                    </div>

                    <button type="submit" className="btn-sim primary">Connect Entities</button>
                  </form>
                </div>

                {/* React Flow canvas for ERD representation */}
                <div className="bpmn-canvas" style={{ background: '#0a0d16', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <ReactFlow
                    nodes={erdNodes}
                    edges={erdEdges}
                    nodeTypes={reactFlowNodeTypes}
                    onNodeClick={onErdNodeClick}
                    onEdgeClick={onErdEdgeClick}
                    fitView
                    draggable={true}
                    panOnDrag={true}
                  >
                    <Background color="rgba(255, 255, 255, 0.04)" gap={16} size={1} />
                    <Controls style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} />
                  </ReactFlow>
                </div>
              </div>
            </section>
          )}

          {/* TAB 3: BPMN Process Workflow visualizer */}
          {activeTab === 'bpmn' && (
            <section className="content-panel is-active" role="tabpanel">
              <div className="bpmn-view-container">
                <div className="bpmn-canvas" style={{ background: '#0a0d16', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={reactFlowNodeTypes}
                    onNodeClick={onNodeClick}
                    onNodeDragStop={onNodeDragStop}
                    fitView
                    draggable={true}
                    panOnDrag={true}
                  >
                    <Background color="rgba(255, 255, 255, 0.04)" gap={16} size={1} />
                    <Controls style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} />
                  </ReactFlow>
                </div>

                {/* Simulation logger console */}
                <div className="simulation-panel">
                  <div className="sim-controls-bar">
                    <div className="sim-status">
                      <span className={`status-dot ${simStatus === 'running' ? 'active' : ''}`}></span>
                      <span>Simulation Status: {simStatus.toUpperCase()}</span>
                    </div>
                    <div className="sim-buttons">
                      <button type="button" className="btn-sim primary" onClick={startSimulation} disabled={simStatus === 'running'}>Run Simulation</button>
                      <button type="button" className="btn-sim" onClick={resetSimulation} disabled={simStatus === 'idle'}>Reset</button>
                    </div>
                  </div>
                  <div className="sim-logger">
                    {simLogs.length === 0 ? (
                      <div className="logger-row system">Click "Run Simulation" to animate React Flow process execution step-by-step...</div>
                    ) : (
                      simLogs.map((log, index) => (
                        <div key={index} className={`logger-row ${log.type}`}>
                          {log.ts}{log.text}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* 3. Right Pane: Properties Inspector */}
      <aside className="inspector-pane" aria-label="Inspector Pane">
        <div className="inspector-header">
          <h3 className="inspector-title">{selectedElement ? selectedElement.title : "Properties"}</h3>
          <p className="inspector-subtitle">{selectedElement ? selectedElement.type : "No Selection"}</p>
        </div>

        <div id="inspector-content-area" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {selectedElement ? (
            selectedElement.category === 'schema' ? (
              <>
                <div className="inspector-section">
                  <p className="inspector-label">Data Type</p>
                  <p className="inspector-value">
                    <span className={`type-badge ${selectedElement.dataType}`}>{selectedElement.dataType.toUpperCase()}</span>
                  </p>
                </div>
                <div className="inspector-section">
                  <p className="inspector-label">Description</p>
                  <p className="inspector-value">{selectedElement.desc}</p>
                </div>
                <div className="inspector-section">
                  <p className="inspector-label">System Constraints</p>
                  <p className="inspector-value-code">{selectedElement.constraints}</p>
                </div>
              </>
            ) : selectedElement.category === 'erd' ? (
              <>
                <div className="inspector-section">
                  <p className="inspector-label">Category Group</p>
                  <p className="inspector-value">{selectedElement.categoryName}</p>
                </div>
                <div className="inspector-section">
                  <p className="inspector-label">Description</p>
                  <p className="inspector-value">{selectedElement.desc}</p>
                </div>
                <div className="inspector-section">
                  <p className="inspector-label">Variables Count</p>
                  <p className="inspector-value">{selectedElement.fieldsCount} variables defined</p>
                </div>
              </>
            ) : selectedElement.category === 'relationship' ? (
              <>
                <div className="inspector-section">
                  <p className="inspector-label">Connection Type</p>
                  <p className="inspector-value" style={{ textTransform: 'capitalize' }}>{selectedElement.relationType.replace('-', ' ')}</p>
                </div>
                <div className="inspector-section">
                  <p className="inspector-label">Source Node</p>
                  <p className="inspector-value-code">{selectedElement.source}</p>
                </div>
                <div className="inspector-section">
                  <p className="inspector-label">Target Node</p>
                  <p className="inspector-value-code">{selectedElement.target}</p>
                </div>
                <div className="inspector-section" style={{ marginTop: '1.5rem' }}>
                  <button 
                    type="button" 
                    className="btn-sim" 
                    style={{ borderColor: '#ef4444', color: '#ef4444', width: '100%' }}
                    onClick={() => handleDeleteRelationship(selectedElement.id)}
                  >
                    Delete Relationship
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="inspector-section">
                  <p className="inspector-label">Node Identifier</p>
                  <p className="inspector-value-code">{selectedElement.id}</p>
                </div>
                {selectedElement.assignee && (
                  <div className="inspector-section">
                    <p className="inspector-label">Task Assignee</p>
                    <p className="inspector-value">👤 {selectedElement.assignee}</p>
                  </div>
                )}
                {selectedElement.url && (
                  <div className="inspector-section">
                    <p className="inspector-label">Webhook URL</p>
                    <p className="inspector-value-code">{selectedElement.url}</p>
                  </div>
                )}
                {selectedElement.condition && (
                  <div className="inspector-section">
                    <p className="inspector-label">Branch Rule Condition</p>
                    <p className="inspector-value-code">{selectedElement.condition}</p>
                  </div>
                )}
                {selectedElement.inputs && (
                  <div className="inspector-section">
                    <p className="inspector-label">Required inputs keys</p>
                    <p className="inspector-value-code">{selectedElement.inputs}</p>
                  </div>
                )}
                {selectedElement.outputs && (
                  <div className="inspector-section">
                    <p className="inspector-label">Returned outputs keys</p>
                    <p className="inspector-value-code">{selectedElement.outputs}</p>
                  </div>
                )}
                {selectedElement.details && (
                  <div className="inspector-section">
                    <p className="inspector-label">Action Description</p>
                    <p className="inspector-value">{selectedElement.details}</p>
                  </div>
                )}
              </>
            )
          ) : (
            <div className="inspector-empty">
              <div className="inspector-empty-icon">🔍</div>
              <div className="inspector-empty-text">Click a schema variable row in the grid, or select a React Flow graph node to inspect properties.</div>
            </div>
          )}
        </div>
      </aside>

      {/* 4. Entity Creator Portal Modal Dialogue */}
      {showAddEntityModal && (
        <div className="modal-overlay" onClick={() => setShowAddEntityModal(false)}>
          <div className="auth" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <button type="button" className="modal-close-btn" onClick={() => setShowAddEntityModal(false)} aria-label="Close modal">
              &times;
            </button>
            <p className="auth-eyebrow">Open Schema Workspace</p>
            <h1>Create Entity</h1>
            <p className="auth-sub" style={{ margin: '0 0 1.25rem 0' }}>Register a new agnostic database object entity.</p>

            <form onSubmit={handleAddEntitySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} novalidate>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label htmlFor="new-ent-name" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Entity Name</label>
                <input 
                  type="text" 
                  id="new-ent-name"
                  placeholder="e.g. Product"
                  value={newEntName}
                  onChange={(e) => setNewEntName(e.target.value)}
                  className="wysiwyg-field-input"
                  style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label htmlFor="new-ent-category" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Category Group</label>
                  <select 
                    id="new-ent-category"
                    value={newEntCategory}
                    onChange={(e) => setNewEntCategory(e.target.value)}
                    className="wysiwyg-field-select"
                    style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <option value="Commercial">Commercial</option>
                    <option value="Resources">Resources</option>
                    <option value="Financials">Financials</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Support">Support</option>
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label htmlFor="new-ent-icon" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Icon Glyph</label>
                  <select 
                    id="new-ent-icon"
                    value={newEntIcon}
                    onChange={(e) => setNewEntIcon(e.target.value)}
                    className="wysiwyg-field-select"
                    style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <option value="📦">📦 Box</option>
                    <option value="👤">👤 Person</option>
                    <option value="🏢">🏢 Building</option>
                    <option value="🛒">🛒 Cart</option>
                    <option value="📒">📒 Ledger</option>
                    <option value="🏷️">🏷️ Tag</option>
                    <option value="🔑">🔑 Key</option>
                    <option value="📃">📃 Paper</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label htmlFor="new-ent-desc" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Brief Description</label>
                <textarea 
                  id="new-ent-desc"
                  placeholder="Memo describing this entity's operational scope..."
                  value={newEntDesc}
                  onChange={(e) => setNewEntDesc(e.target.value)}
                  className="wysiwyg-field-input"
                  style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', minHeight: '60px', resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn-submit" style={{ marginTop: '0.5rem' }}>Create Entity</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 5. React Application Mount Checks
 * ------------------------------------------------------------------ */
const authRootElement = document.getElementById('auth-root');
if (authRootElement) {
  const root = createRoot(authRootElement);
  root.render(<AuthApp />);
}

const workbenchRootElement = document.getElementById('schema-workbench-root');
if (workbenchRootElement) {
  const root = createRoot(workbenchRootElement);
  root.render(<SchemaWorkbench />);
}
