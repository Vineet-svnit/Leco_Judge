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

function QuestionDetailContent({ user, logout }) {
	const { id } = useParams();
	const { question, isLoading, error } = useQuestion(id);
	const [code, setCode] = useState('');
	const [language, setLanguage] = useState('cpp');
	const [activeTab, setActiveTab] = useState('testcase');
	const [isRunning, setIsRunning] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [runResult, setRunResult] = useState(null);
	const [submitResult, setSubmitResult] = useState(null);
	const [submissionsList, setSubmissionsList] = useState([]);
	const [isLoadingHistory, setIsLoadingHistory] = useState(false);

	useEffect(() => {
		if (question?.languages) {
			const cppSnippet = question.languages.find((l) => l.lang === 'cpp');
			if (cppSnippet) {
				setCode(cppSnippet.classSnippet || '');
			} else {
				setCode('');
			}
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
		if (question?._id) {
			loadHistory();
		}
	}, [question]);

	const pollStatus = async (submissionId, type) => {
		const maxAttempts = 30;
		for (let i = 0; i < maxAttempts; i++) {
			await new Promise((r) => setTimeout(r, 1000));
			try {
				const response = await submissionApi.getStatus(submissionId);
				const sub = response.submission;
				if (sub.status === 'COMPLETED') {
					if (type === 'run') {
						setRunResult(sub);
						setIsRunning(false);
					} else {
						setSubmitResult(sub);
						setIsSubmitting(false);
						loadHistory();
					}
					return;
				}
			} catch (e) {
				console.error('Error polling status:', e);
			}
		}

		const timeoutResult = {
			status: 'COMPLETED',
			verdict: 'SYSTEM_ERROR',
			compilerOutput: 'Execution timed out waiting for results.',
		};

		if (type === 'run') {
			setRunResult(timeoutResult);
			setIsRunning(false);
		} else {
			setSubmitResult(timeoutResult);
			setIsSubmitting(false);
		}
	};

	const handleRun = async () => {
		if (isRunning || isSubmitting || !question?._id) return;
		setIsRunning(true);
		setRunResult(null);
		setActiveTab('result');
		try {
			const res = await submissionApi.run(question._id, 'cpp', code);
			if (res.submission?._id) {
				pollStatus(res.submission._id, 'run');
			} else {
				throw new Error('No submission ID returned');
			}
		} catch (err) {
			setRunResult({
				status: 'COMPLETED',
				verdict: 'SYSTEM_ERROR',
				compilerOutput: err.message || 'Failed to trigger run.',
			});
			setIsRunning(false);
		}
	};

	const handleSubmit = async () => {
		if (isRunning || isSubmitting || !question?._id) return;
		setIsSubmitting(true);
		setSubmitResult(null);
		setActiveTab('result');
		try {
			const res = await submissionApi.submit(question._id, 'cpp', code);
			if (res.submission?._id) {
				pollStatus(res.submission._id, 'submit');
			} else {
				throw new Error('No submission ID returned');
			}
		} catch (err) {
			setSubmitResult({
				status: 'COMPLETED',
				verdict: 'SYSTEM_ERROR',
				compilerOutput: err.message || 'Failed to trigger submit.',
			});
			setIsSubmitting(false);
		}
	};

	const getVerdictLabel = (verdict) => {
		switch (verdict) {
			case 'AC':
				return { label: 'Accepted', className: 'verdict-ac' };
			case 'WA':
				return { label: 'Wrong Answer', className: 'verdict-wa' };
			case 'TLE':
				return { label: 'Time Limit Exceeded', className: 'verdict-tle' };
			case 'RE':
				return { label: 'Runtime Error', className: 'verdict-re' };
			case 'CE':
				return { label: 'Compile Error', className: 'verdict-ce' };
			default:
				return { label: 'System Error', className: 'verdict-se' };
		}
	};

	const activeResult = isRunning ? null : isSubmitting ? null : runResult || submitResult;
	const activeLoading = isRunning || isSubmitting;

	return (
		<main className="page-shell page-shell--full question-shell">
			<AppNavbar user={user} onLogout={logout} />
			<section className="question-solver">
				<p className="page-kicker">Question details</p>
				{isLoading ? <p className="empty-state">Loading question...</p> : null}
				{error ? <p className="empty-state empty-state--error">{error}</p> : null}

				{question ? (
					<article className="question-solver__layout">
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
								) : (
									<span>No topic yet</span>
								)}
							</p>

							<div className="question-solver__body">
								<div
									className="rich-content"
									dangerouslySetInnerHTML={{ __html: question.statement }}
								/>
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
									question.examples.map((example, index) => (
										<article className="example-card" key={`${question._id}-example-${index}`}>
											<div className="example-card__header">
												<h3>Example {index + 1}</h3>
											</div>
											<div className="example-grid">
												<div>
													<p className="example-label">Input</p>
													<pre>{example.input}</pre>
												</div>
												<div>
													<p className="example-label">Output</p>
													<pre>{example.output}</pre>
												</div>
											</div>
											{example.image ? (
												<img className="example-card__image" src={example.image} alt={`Example ${index + 1}`} />
											) : null}
											{example.explanation ? <p className="example-explanation">{example.explanation}</p> : null}
										</article>
									))
								) : (
									<p className="empty-state">No examples added yet.</p>
								)}
							</section>

							<section className="question-solver__section">
								<div className="section-heading">
									<h2>Constraints</h2>
								</div>
								{question.constraints ? (
									<div
										className="question-solver__constraints rich-content"
										dangerouslySetInnerHTML={{ __html: question.constraints }}
									/>
								) : (
									<p className="empty-state">No constraints added yet.</p>
								)}
							</section>
						</aside>

						<section className="question-solver__right">
							<div className="code-editor-panel">
								<div className="code-editor-panel__header">
									<h2>Code editor</h2>
									<select
										value={language}
										onChange={(e) => setLanguage(e.target.value)}
										className="lang-selector"
										title="Language Selector"
										disabled
									>
										<option value="cpp">C++</option>
									</select>
								</div>

								<div className="monaco-container">
									<Editor
										height="100%"
										language="cpp"
										theme="vs-dark"
										value={code}
										onChange={(value) => setCode(value || '')}
										options={{
											minimap: { enabled: false },
											fontSize: 14,
											automaticLayout: true,
											scrollBeyondLastLine: false,
											padding: { top: 12, bottom: 12 },
										}}
									/>
								</div>

								<div className="console-panel">
									<div className="console-panel__tabs">
										<button
											className={`console-tab ${activeTab === 'testcase' ? 'console-tab--active' : ''}`}
											onClick={() => setActiveTab('testcase')}
										>
											Testcase
										</button>
										<button
											className={`console-tab ${activeTab === 'result' ? 'console-tab--active' : ''}`}
											onClick={() => setActiveTab('result')}
										>
											Result
										</button>
										<button
											className={`console-tab ${activeTab === 'submissions' ? 'console-tab--active' : ''}`}
											onClick={() => {
												setActiveTab('submissions');
												loadHistory();
											}}
										>
											Submissions
										</button>
									</div>

									<div className="console-panel__body">
										{activeTab === 'testcase' && (
											<div className="console-testcases-list">
												{question.examples?.length ? (
													question.examples.map((example, index) => (
														<div className="console-testcase-item" key={index}>
															<h4>Example {index + 1}</h4>
															<div className="console-io-row">
																<strong>Input:</strong>
																<pre>{example.input}</pre>
															</div>
															<div className="console-io-row">
																<strong>Output:</strong>
																<pre>{example.output}</pre>
															</div>
														</div>
													))
												) : (
													<p className="empty-state">No sample testcases available.</p>
												)}
											</div>
										)}

										{activeTab === 'result' && (
											<div className="console-results">
												{activeLoading ? (
													<div className="console-loading">
														<span className="spinner"></span>
														<p>Running your code... Please wait.</p>
													</div>
												) : activeResult ? (
													<div>
														<div className="verdict-banner">
															<span
																className={`verdict-tag ${
																	getVerdictLabel(activeResult.verdict).className
																}`}
															>
																{getVerdictLabel(activeResult.verdict).label}
															</span>
															{activeResult.executionTime !== undefined && (
																<span className="result-metric">
																	Runtime: {activeResult.executionTime} ms
																</span>
															)}
															{activeResult.memoryUsed !== undefined && (
																<span className="result-metric">
																	Memory: {(activeResult.memoryUsed / 1024 / 1024).toFixed(2)} MB
																</span>
															)}
														</div>

														{activeResult.compilerOutput && (
															<div className="console-logs">
																<h5>Logs / Errors:</h5>
																<pre>{activeResult.compilerOutput}</pre>
															</div>
														)}

														{activeResult.firstFailedTestCase && (
															<div className="failed-testcase-details">
																<h5>First Failed Test Case:</h5>
																<div className="failed-tc-row">
																	<strong>Input:</strong>
																	<pre>{activeResult.firstFailedTestCase.input}</pre>
																</div>
																<div className="failed-tc-row">
																	<strong>Expected Output:</strong>
																	<pre>{activeResult.firstFailedTestCase.expectedOutput}</pre>
																</div>
																<div className="failed-tc-row">
																	<strong>Your Output:</strong>
																	<pre>{activeResult.firstFailedTestCase.actualOutput}</pre>
																</div>
															</div>
														)}
													</div>
												) : (
													<p className="empty-state">Please run or submit code to see results.</p>
												)}
											</div>
										)}

										{activeTab === 'submissions' && (
											<div className="console-history">
												{isLoadingHistory ? (
													<p className="empty-state">Loading submissions...</p>
												) : submissionsList.length ? (
													<table className="history-table">
														<thead>
															<tr>
																<th>Time</th>
																<th>Status</th>
																<th>Runtime</th>
																<th>Language</th>
															</tr>
														</thead>
														<tbody>
															{submissionsList.map((sub) => (
																<tr key={sub._id}>
																	<td>{new Date(sub.createdAt).toLocaleString()}</td>
																	<td>
																		<span
																			className={`verdict-tag ${
																				getVerdictLabel(sub.verdict).className
																			}`}
																		>
																			{getVerdictLabel(sub.verdict).label}
																		</span>
																	</td>
																	<td>{sub.executionTime !== undefined ? `${sub.executionTime} ms` : '-'}</td>
																	<td>{sub.language}</td>
																</tr>
															))}
														</tbody>
													</table>
												) : (
													<p className="empty-state">No submissions yet.</p>
												)}
											</div>
										)}
									</div>

									<div className="console-panel__footer">
										<button
											className="page-button page-button--secondary"
											onClick={handleRun}
											disabled={isRunning || isSubmitting}
										>
											{isRunning ? 'Running...' : 'Run Code'}
										</button>
										<button
											className="page-button page-button--primary"
											onClick={handleSubmit}
											disabled={isRunning || isSubmitting}
										>
											{isSubmitting ? 'Submitting...' : 'Submit'}
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