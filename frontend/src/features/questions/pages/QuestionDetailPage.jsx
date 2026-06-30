import { Navigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';

import { AppNavbar } from '../../shared/components/AppNavbar.jsx';
import { useQuestion } from '../hooks/useQuestion.js';
import { submissionApi } from '../services/submissionService.js';

export default function QuestionDetailPage({ user, logout }) {
	if (!user) {
		return <Navigate to="/login" replace />;
	}
	return <QuestionDetailContent user={user} logout={logout} />;
}

const VERDICT_META = {
	AC:           { label: 'Accepted',              className: 'verdict-ac' },
	WA:           { label: 'Wrong Answer',           className: 'verdict-wa' },
	TLE:          { label: 'Time Limit Exceeded',    className: 'verdict-tle' },
	MLE:          { label: 'Memory Limit Exceeded',  className: 'verdict-mle' },
	RE:           { label: 'Runtime Error',          className: 'verdict-re' },
	CE:           { label: 'Compile Error',          className: 'verdict-ce' },
	SYSTEM_ERROR: { label: 'System Error',           className: 'verdict-se' },
};

const getVerdictMeta = (verdict) => VERDICT_META[verdict] ?? VERDICT_META.SYSTEM_ERROR;

// Displays a single verdict result (used for both run and submit panels)
function ResultPanel({ result, loading, loadingLabel, emptyLabel }) {
	if (loading) {
		return (
			<div className="console-loading">
				<span className="spinner" />
				<p>{loadingLabel}</p>
			</div>
		);
	}

	if (!result) {
		return <p className="empty-state">{emptyLabel}</p>;
	}

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

			{/* Submit: first failed hidden testcase */}
			{result.firstFailedTestCase && (
				<div className="failed-testcase-details">
					<h5>First failed testcase:</h5>
					<div className="failed-tc-row">
						<strong>Input:</strong>
						<pre>{result.firstFailedTestCase.input}</pre>
					</div>
					<div className="failed-tc-row">
						<strong>Expected:</strong>
						<pre>{result.firstFailedTestCase.expectedOutput}</pre>
					</div>
					<div className="failed-tc-row">
						<strong>Your output:</strong>
						<pre>{result.firstFailedTestCase.actualOutput}</pre>
					</div>
				</div>
			)}

			{/* Run: per-example breakdown */}
			{result.perExample?.length > 0 && (
				<div className="per-example-results">
					{result.perExample.map((ex, i) => (
						<div
							key={i}
							className={`per-example-item ${ex.passed ? 'per-example-item--pass' : 'per-example-item--fail'}`}
						>
							<div className="per-example-header">
								<span>Example {i + 1}</span>
								<span className={`verdict-tag ${ex.passed ? 'verdict-ac' : 'verdict-wa'}`}>
									{ex.passed ? 'Passed' : 'Failed'}
								</span>
							</div>
							<div className="per-example-grid">
								<div>
									<p className="example-label">Input</p>
									<pre>{ex.input}</pre>
								</div>
								<div>
									<p className="example-label">Expected</p>
									<pre>{ex.expectedOutput}</pre>
								</div>
								<div>
									<p className="example-label">Your output</p>
									<pre>{ex.actualOutput}</pre>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function QuestionDetailContent({ user, logout }) {
	const { id } = useParams();
	const { question, isLoading, error } = useQuestion(id);

	const [code, setCode] = useState('');
	const [language] = useState('cpp');

	// Run state — fully independent from submit
	const [isRunning, setIsRunning]     = useState(false);
	const [runResult, setRunResult]     = useState(null);

	// Submit state — fully independent from run
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitResult, setSubmitResult] = useState(null);

	// Console tabs: 'testcase' | 'run' | 'submit' | 'submissions'
	const [activeTab, setActiveTab] = useState('testcase');

	const [submissionsList, setSubmissionsList]     = useState([]);
	const [isLoadingHistory, setIsLoadingHistory]   = useState(false);

	useEffect(() => {
		if (question?.languages) {
			const cppSnippet = question.languages.find((l) => l.lang === 'cpp');
			setCode(cppSnippet?.classSnippet || '');
		} else {
			setCode('');
		}
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

	useEffect(() => {
		if (question?._id) loadHistory();
	}, [question]);

	// Run and submit are fully independent — no mutual blocking
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
		<main className="page-shell page-shell--full question-shell">
			<AppNavbar user={user} onLogout={logout} />
			<section className="question-solver">
				<p className="page-kicker">Question details</p>
				{isLoading ? <p className="empty-state">Loading question...</p> : null}
				{error   ? <p className="empty-state empty-state--error">{error}</p> : null}

				{question ? (
					<article className="question-solver__layout">
						{/* ── Left pane: question ── */}
						<aside className="question-solver__left">
							<div className="question-solver__question-meta">
								<span className="question-solver__number">#{question.questionNo ?? '-'}</span>
								<div
									className="question-solver__title rich-content"
									dangerouslySetInnerHTML={{ __html: question.title }}
								/>
							</div>

							<p className="question-solver__inline-meta">
								<span className={`status-chip status-chip--${question.difficulty.toLowerCase()}`}>
									{question.difficulty}
								</span>
								{question.topic ? (
									<span
										className="rich-content rich-content--inline"
										dangerouslySetInnerHTML={{ __html: question.topic }}
									/>
								) : <span>No topic yet</span>}
							</p>

							<div className="question-solver__body">
								<div className="rich-content" dangerouslySetInnerHTML={{ __html: question.statement }} />
								{question.image ? (
									<img className="question-solver__image" src={question.image} alt="Question" />
								) : null}
							</div>

							<section className="question-solver__section">
								<div className="section-heading">
									<h2>Examples</h2>
									<span>{question.examples?.length || 0} sample case(s)</span>
								</div>
								{question.examples?.length ? (
									question.examples.map((ex, i) => (
										<article className="example-card" key={`${question._id}-ex-${i}`}>
											<div className="example-card__header"><h3>Example {i + 1}</h3></div>
											<div className="example-grid">
												<div><p className="example-label">Input</p><pre>{ex.input}</pre></div>
												<div><p className="example-label">Output</p><pre>{ex.output}</pre></div>
											</div>
											{ex.image ? <img className="example-card__image" src={ex.image} alt={`Example ${i + 1}`} /> : null}
											{ex.explanation ? <p className="example-explanation">{ex.explanation}</p> : null}
										</article>
									))
								) : <p className="empty-state">No examples added yet.</p>}
							</section>

							<section className="question-solver__section">
								<div className="section-heading"><h2>Constraints</h2></div>
								{question.constraints ? (
									<div
										className="question-solver__constraints rich-content"
										dangerouslySetInnerHTML={{ __html: question.constraints }}
									/>
								) : <p className="empty-state">No constraints added yet.</p>}
							</section>
						</aside>

						{/* ── Right pane: editor + console ── */}
						<section className="question-solver__right">
							<div className="code-editor-panel">
								<div className="code-editor-panel__header">
									<h2>Code editor</h2>
									<select className="lang-selector" title="Language" disabled>
										<option value="cpp">C++</option>
									</select>
								</div>

								<div className="monaco-container">
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

								{/* Console */}
								<div className="console-panel">
									<div className="console-panel__tabs">
										<button
											className={`console-tab ${activeTab === 'testcase' ? 'console-tab--active' : ''}`}
											onClick={() => setActiveTab('testcase')}
										>
											Testcase
										</button>
										<button
											className={`console-tab ${activeTab === 'run' ? 'console-tab--active' : ''} ${isRunning ? 'console-tab--loading' : ''}`}
											onClick={() => setActiveTab('run')}
										>
											{isRunning ? 'Running…' : 'Run result'}
										</button>
										<button
											className={`console-tab ${activeTab === 'submit' ? 'console-tab--active' : ''} ${isSubmitting ? 'console-tab--loading' : ''}`}
											onClick={() => setActiveTab('submit')}
										>
											{isSubmitting ? 'Judging…' : 'Submit result'}
										</button>
										<button
											className={`console-tab ${activeTab === 'submissions' ? 'console-tab--active' : ''}`}
											onClick={() => { setActiveTab('submissions'); loadHistory(); }}
										>
											History
										</button>
									</div>

									<div className="console-panel__body">
										{activeTab === 'testcase' && (
											<div className="console-testcases-list">
												{question.examples?.length ? (
													question.examples.map((ex, i) => (
														<div className="console-testcase-item" key={i}>
															<h4>Example {i + 1}</h4>
															<div className="console-io-row"><strong>Input:</strong><pre>{ex.input}</pre></div>
															<div className="console-io-row"><strong>Output:</strong><pre>{ex.output}</pre></div>
														</div>
													))
												) : <p className="empty-state">No sample testcases available.</p>}
											</div>
										)}

										{activeTab === 'run' && (
											<ResultPanel
												result={runResult}
												loading={isRunning}
												loadingLabel="Running against examples…"
												emptyLabel="Click Run Code to test against examples."
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
													<p className="empty-state">Loading submissions…</p>
												) : submissionsList.length ? (
													<table className="history-table">
														<thead>
															<tr>
																<th>Time</th>
																<th>Verdict</th>
																<th>Runtime</th>
																<th>Language</th>
															</tr>
														</thead>
														<tbody>
															{submissionsList.map((sub) => {
																const m = getVerdictMeta(sub.verdict);
																return (
																	<tr key={sub._id}>
																		<td>{new Date(sub.createdAt).toLocaleString()}</td>
																		<td><span className={`verdict-tag ${m.className}`}>{m.label}</span></td>
																		<td>{sub.executionTime !== undefined ? `${sub.executionTime} ms` : '-'}</td>
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

									<div className="console-panel__footer">
										<button
											className="page-button page-button--secondary"
											onClick={handleRun}
											disabled={isRunning}
										>
											{isRunning ? 'Running…' : 'Run Code'}
										</button>
										<button
											className="page-button page-button--primary"
											onClick={handleSubmit}
											disabled={isSubmitting}
										>
											{isSubmitting ? 'Submitting…' : 'Submit'}
										</button>
									</div>
								</div>
							</div>
						</section>
					</article>
				) : null}
			</section>
		</main>
	);
}
