import { Navigate, useParams } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';

import { AppNavbar } from '../../shared/components/AppNavbar.jsx';
import { useQuestion } from '../hooks/useQuestion.js';
import { submissionApi } from '../services/submissionService.js';

export default function QuestionDetailPage({ user, logout }) {
	if (!user) return <Navigate to="/login" replace />;
	return <QuestionDetailContent user={user} logout={logout} />;
}

/* ── Verdict helpers ──────────────────────────────────────────── */
const VERDICT_META = {
	AC:           { label: 'Accepted',             className: 'verdict-ac' },
	WA:           { label: 'Wrong Answer',          className: 'verdict-wa' },
	TLE:          { label: 'Time Limit Exceeded',   className: 'verdict-tle' },
	MLE:          { label: 'Memory Limit Exceeded', className: 'verdict-mle' },
	RE:           { label: 'Runtime Error',         className: 'verdict-re' },
	CE:           { label: 'Compile Error',         className: 'verdict-ce' },
	SYSTEM_ERROR: { label: 'System Error',          className: 'verdict-se' },
};
const getVerdictMeta = (v) => VERDICT_META[v] ?? VERDICT_META.SYSTEM_ERROR;

/* ── ResultPanel ─────────────────────────────────────────────── */
function ResultPanel({ result, loading, loadingLabel, emptyLabel }) {
	if (loading) {
		return (
			<div className="console-loading">
				<span className="spinner" />
				<p>{loadingLabel}</p>
			</div>
		);
	}
	if (!result) return <p className="empty-state">{emptyLabel}</p>;

	const meta = getVerdictMeta(result.verdict);
	return (
		<div className="result-panel">
			<div className="verdict-banner">
				<span className={`verdict-tag ${meta.className}`}>{meta.label}</span>
				{result.executionTime !== undefined && (
					<span className="result-metric">Runtime: {result.executionTime} ms</span>
				)}
			</div>

			{result.compilerOutput && (
				<div className="console-logs">
					<h5>Compiler output:</h5>
					<pre>{result.compilerOutput}</pre>
				</div>
			)}

			{result.firstFailedTestCase && (
				<div className="failed-testcase-details">
					<h5>First failed testcase:</h5>
					<div className="failed-tc-row"><strong>Input:</strong><pre>{result.firstFailedTestCase.input}</pre></div>
					<div className="failed-tc-row"><strong>Expected:</strong><pre>{result.firstFailedTestCase.expectedOutput}</pre></div>
					<div className="failed-tc-row"><strong>Your output:</strong><pre>{result.firstFailedTestCase.actualOutput}</pre></div>
				</div>
			)}

			{result.perExample?.length > 0 && (
				<div className="per-example-results">
					{result.perExample.map((ex, i) => (
						<div key={i} className={`per-example-item ${ex.passed ? 'per-example-item--pass' : 'per-example-item--fail'}`}>
							<div className="per-example-header">
								<span>Example {i + 1}</span>
								<span className={`verdict-tag ${ex.passed ? 'verdict-ac' : 'verdict-wa'}`}>
									{ex.passed ? 'Passed' : 'Failed'}
								</span>
							</div>
							<div className="per-example-grid">
								<div><p className="example-label">Input</p><pre>{ex.input}</pre></div>
								<div><p className="example-label">Expected</p><pre>{ex.expectedOutput}</pre></div>
								<div><p className="example-label">Your output</p><pre>{ex.actualOutput}</pre></div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

/* ── Draggable splitter hook ─────────────────────────────────── */
function useHorizontalSplitter(initialPct = 40, minPct = 22, maxPct = 70) {
	const [splitPct, setSplitPct] = useState(initialPct);
	const dragging = useRef(false);
	const containerRef = useRef(null);

	const onMouseDown = useCallback((e) => {
		e.preventDefault();
		dragging.current = true;
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
	}, []);

	useEffect(() => {
		const onMove = (e) => {
			if (!dragging.current || !containerRef.current) return;
			const rect = containerRef.current.getBoundingClientRect();
			const pct = ((e.clientX - rect.left) / rect.width) * 100;
			setSplitPct(Math.min(maxPct, Math.max(minPct, pct)));
		};
		const onUp = () => {
			dragging.current = false;
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
		return () => {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		};
	}, [minPct, maxPct]);

	return { splitPct, containerRef, onMouseDown };
}

/* vertical splitter for editor / console inside right pane */
function useVerticalSplitter(initialPct = 62, minPct = 25, maxPct = 82) {
	const [splitPct, setSplitPct] = useState(initialPct);
	const dragging = useRef(false);
	const containerRef = useRef(null);

	const onMouseDown = useCallback((e) => {
		e.preventDefault();
		dragging.current = true;
		document.body.style.cursor = 'row-resize';
		document.body.style.userSelect = 'none';
	}, []);

	useEffect(() => {
		const onMove = (e) => {
			if (!dragging.current || !containerRef.current) return;
			const rect = containerRef.current.getBoundingClientRect();
			const pct = ((e.clientY - rect.top) / rect.height) * 100;
			setSplitPct(Math.min(maxPct, Math.max(minPct, pct)));
		};
		const onUp = () => {
			dragging.current = false;
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
		return () => {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		};
	}, [minPct, maxPct]);

	return { splitPct, containerRef, onMouseDown };
}

/* ── Main component ──────────────────────────────────────────── */
function QuestionDetailContent({ user, logout }) {
	const { id } = useParams();
	const { question, isLoading, error } = useQuestion(id);

	const [code, setCode]                     = useState('');
	const [language]                          = useState('cpp');
	const [isRunning, setIsRunning]           = useState(false);
	const [runResult, setRunResult]           = useState(null);
	const [isSubmitting, setIsSubmitting]     = useState(false);
	const [submitResult, setSubmitResult]     = useState(null);
	const [activeTab, setActiveTab]           = useState('testcase');
	const [submissionsList, setSubmissionsList]   = useState([]);
	const [isLoadingHistory, setIsLoadingHistory] = useState(false);

	// Horizontal splitter: left pane % of total width
	const hSplit = useHorizontalSplitter(40);
	// Vertical splitter inside right pane: editor % of pane height
	const vSplit = useVerticalSplitter(62);

	useEffect(() => {
		if (question?.languages) {
			const cpp = question.languages.find((l) => l.lang === 'cpp');
			setCode(cpp?.classSnippet || '');
		} else setCode('');
	}, [question]);

	const loadHistory = async () => {
		if (!question?._id) return;
		setIsLoadingHistory(true);
		try {
			const res = await submissionApi.getHistory(question._id);
			setSubmissionsList(res.submissions || []);
		} catch (err) {
			console.error('Failed to load submission history:', err);
		} finally {
			setIsLoadingHistory(false);
		}
	};

	useEffect(() => { if (question?._id) loadHistory(); }, [question]);

	const handleRun = async () => {
		if (isRunning || !question?._id) return;
		setIsRunning(true);
		setRunResult(null);
		setActiveTab('run');
		try {
			const result = await submissionApi.run(question._id, language, code);
			setRunResult(result);
		} catch (err) {
			setRunResult({ verdict: 'SYSTEM_ERROR', compilerOutput: err.message || 'Failed to run.' });
		} finally {
			setIsRunning(false);
		}
	};

	const handleSubmit = async () => {
		if (isSubmitting || !question?._id) return;
		setIsSubmitting(true);
		setSubmitResult(null);
		setActiveTab('submit');
		try {
			const result = await submissionApi.submit(question._id, language, code);
			setSubmitResult(result);
			loadHistory();
		} catch (err) {
			setSubmitResult({ verdict: 'SYSTEM_ERROR', compilerOutput: err.message || 'Failed to submit.' });
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="qs-shell">
			<AppNavbar user={user} onLogout={logout} />

			{isLoading && <p className="empty-state" style={{ margin: '24px' }}>Loading question…</p>}
			{error     && <p className="empty-state empty-state--error" style={{ margin: '24px' }}>{error}</p>}

			{question && (
				<div className="qs-layout" ref={hSplit.containerRef}>
					{/* ── LEFT PANE ── */}
					<aside
						className="qs-left"
						style={{ width: `${hSplit.splitPct}%` }}
					>
						<div className="qs-left__scroll">
							<div className="qs-question-meta">
								<span className="question-solver__number">#{question.questionNo ?? '-'}</span>
								<div className="question-solver__title rich-content" dangerouslySetInnerHTML={{ __html: question.title }} />
							</div>

							<p className="question-solver__inline-meta">
								<span className={`status-chip status-chip--${question.difficulty.toLowerCase()}`}>{question.difficulty}</span>
								{question.topic
									? <span className="rich-content rich-content--inline" dangerouslySetInnerHTML={{ __html: question.topic }} />
									: <span>No topic</span>}
							</p>

							<div className="question-solver__body">
								<div className="rich-content" dangerouslySetInnerHTML={{ __html: question.statement }} />
								{question.image && <img className="question-solver__image" src={question.image} alt="Question" />}
							</div>

							<section className="question-solver__section">
								<div className="section-heading">
									<h2>Examples</h2>
									<span>{question.examples?.length || 0} sample case(s)</span>
								</div>
								{question.examples?.length ? question.examples.map((ex, i) => (
									<article className="example-card" key={`${question._id}-ex-${i}`}>
										<div className="example-card__header"><h3>Example {i + 1}</h3></div>
										<div className="example-grid">
											<div><p className="example-label">Input</p><pre>{ex.input}</pre></div>
											<div><p className="example-label">Output</p><pre>{ex.output}</pre></div>
										</div>
										{ex.image && <img className="example-card__image" src={ex.image} alt={`Example ${i + 1}`} />}
										{ex.explanation && <p className="example-explanation">{ex.explanation}</p>}
									</article>
								)) : <p className="empty-state">No examples yet.</p>}
							</section>

							<section className="question-solver__section">
								<div className="section-heading"><h2>Constraints</h2></div>
								{question.constraints
									? <div className="question-solver__constraints rich-content" dangerouslySetInnerHTML={{ __html: question.constraints }} />
									: <p className="empty-state">No constraints yet.</p>}
							</section>
						</div>
					</aside>

					{/* ── HORIZONTAL DRAG HANDLE ── */}
					<div className="qs-divider qs-divider--h" onMouseDown={hSplit.onMouseDown}>
						<div className="qs-divider__grip" />
					</div>

					{/* ── RIGHT PANE ── */}
					<div
						className="qs-right"
						ref={vSplit.containerRef}
						style={{ width: `calc(${100 - hSplit.splitPct}% - 6px)` }}
					>
						{/* Editor panel */}
						<div className="qs-editor-panel" style={{ height: `${vSplit.splitPct}%` }}>
							<div className="qs-editor-header">
								<span className="qs-editor-header__label">Code</span>
								<select className="lang-selector" disabled>
									<option value="cpp">C++</option>
								</select>
								<div className="qs-editor-header__actions">
									<button className="page-button page-button--secondary qs-btn-sm" onClick={handleRun} disabled={isRunning}>
										{isRunning ? 'Running…' : 'Run'}
									</button>
									<button className="page-button page-button--primary qs-btn-sm" onClick={handleSubmit} disabled={isSubmitting}>
										{isSubmitting ? 'Submitting…' : 'Submit'}
									</button>
								</div>
							</div>
							<div className="qs-monaco-wrap">
								<Editor
									height="100%"
									language="cpp"
									theme="vs-dark"
									value={code}
									onChange={(v) => setCode(v || '')}
									options={{
										minimap: { enabled: false },
										fontSize: 14,
										automaticLayout: true,
										scrollBeyondLastLine: false,
										padding: { top: 12, bottom: 12 },
									}}
								/>
							</div>
						</div>

						{/* ── VERTICAL DRAG HANDLE ── */}
						<div className="qs-divider qs-divider--v" onMouseDown={vSplit.onMouseDown}>
							<div className="qs-divider__grip" />
						</div>

						{/* Console panel */}
						<div className="qs-console-panel" style={{ height: `calc(${100 - vSplit.splitPct}% - 6px)` }}>
							<div className="console-panel__tabs">
								{[
									{ key: 'testcase', label: 'Testcase' },
									{ key: 'run',      label: isRunning    ? 'Running…'  : 'Run result',    loading: isRunning },
									{ key: 'submit',   label: isSubmitting ? 'Judging…'  : 'Submit result', loading: isSubmitting },
									{ key: 'submissions', label: 'History' },
								].map(({ key, label, loading }) => (
									<button
										key={key}
										className={`console-tab${activeTab === key ? ' console-tab--active' : ''}${loading ? ' console-tab--loading' : ''}`}
										onClick={() => { setActiveTab(key); if (key === 'submissions') loadHistory(); }}
									>
										{label}
									</button>
								))}
							</div>

							<div className="qs-console-body">
								{activeTab === 'testcase' && (
									<div className="console-testcases-list">
										{question.examples?.length ? question.examples.map((ex, i) => (
											<div className="console-testcase-item" key={i}>
												<h4>Example {i + 1}</h4>
												<div className="console-io-row"><strong>Input:</strong><pre>{ex.input}</pre></div>
												<div className="console-io-row"><strong>Output:</strong><pre>{ex.output}</pre></div>
											</div>
										)) : <p className="empty-state">No sample testcases available.</p>}
									</div>
								)}

								{activeTab === 'run' && (
									<ResultPanel
										result={runResult}
										loading={isRunning}
										loadingLabel="Running against examples…"
										emptyLabel="Click Run to test against examples."
									/>
								)}

								{activeTab === 'submit' && (
									<ResultPanel
										result={submitResult}
										loading={isSubmitting}
										loadingLabel="Judging your submission…"
										emptyLabel="Click Submit to judge against all testcases."
									/>
								)}

								{activeTab === 'submissions' && (
									<div className="console-history">
										{isLoadingHistory ? (
											<p className="empty-state">Loading…</p>
										) : submissionsList.length ? (
											<table className="history-table">
												<thead>
													<tr><th>Time</th><th>Verdict</th><th>Runtime</th><th>Lang</th></tr>
												</thead>
												<tbody>
													{submissionsList.map((sub) => {
														const m = getVerdictMeta(sub.verdict);
														return (
															<tr key={sub._id}>
																<td>{new Date(sub.createdAt).toLocaleString()}</td>
																<td><span className={`verdict-tag ${m.className}`}>{m.label}</span></td>
																<td>{sub.executionTime !== undefined ? `${sub.executionTime} ms` : '—'}</td>
																<td>{sub.language}</td>
															</tr>
														);
													})}
												</tbody>
											</table>
										) : <p className="empty-state">No submissions yet.</p>}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
