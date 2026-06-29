import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useNavigate, useParams } from 'react-router-dom';

import { useQuestions } from '../../questions/hooks/useQuestions.js';
import { QuestionList } from '../../questions/components/QuestionList.jsx';
import { QuestionForm } from '../../questions/components/QuestionForm.jsx';
import { questionApi } from '../../questions/services/questionService.js';

export default function AdminPage({ user }) {
	if (!user) {
		return <Navigate to="/login" replace />;
	}

	if (user.role !== 'ADMIN') {
		return <Navigate to="/" replace />;
	}

	return <Outlet />;
}

export function AdminHome() {
	const { questions, isLoading, error } = useQuestions();

	return (
		<main className="page-shell">
			<header className="page-header page-header--split">
				<div className="page-header__copy">
					<p className="page-kicker">Admin</p>
					<h1>Question management</h1>
					<p className="page-lead">
						Create, inspect, and update questions from a single admin surface. Public users see the
						same question list, but only admins get edit controls.
					</p>
				</div>
				<div className="page-header__actions">
					<span className="status-chip status-chip--admin">Admin only</span>
					<Link to="/admin/questions/new" className="page-button page-button--primary">
						Add question
					</Link>
				</div>
			</header>
			<section className="page-panel">
				{isLoading ? <p className="empty-state">Loading questions...</p> : null}
				{error ? <p className="empty-state empty-state--error">{error}</p> : null}
				{!isLoading && !error ? <QuestionList questions={questions} basePath="/admin/questions" /> : null}
			</section>
		</main>
	);
}

export function QuestionEditorPage({ mode }) {
	const [state, setState] = useState({ isLoading: false, error: '', question: null });
	const params = useParams();
	const navigate = useNavigate();

	useEffect(() => {
		if (mode === 'create') {
			setState({ isLoading: false, error: '', question: null });
			return;
		}

		let mounted = true;
		setState((current) => ({ ...current, isLoading: true }));
		questionApi
			.getById(params.id)
			.then((data) => {
				if (mounted) {
					const question = data?.question || null;
					// Load testcases for edit mode
					if (question?._id) {
						questionApi
							.listTestcases(question._id)
							.then((tcData) => {
								if (mounted) {
									setState({
										isLoading: false,
										error: '',
										question: { ...question, testcases: tcData?.testcases || [] },
									});
								}
							})
							.catch(() => {
								if (mounted) {
									setState({ isLoading: false, error: '', question });
								}
							});
					} else {
						setState({ isLoading: false, error: '', question });
					}
				}
			})
			.catch(() => {
				if (mounted) {
					setState({ isLoading: false, error: 'Failed to load question.', question: null });
				}
			});

		return () => {
			mounted = false;
		};
	}, [mode, params.id]);

	const handleSubmit = async (payload) => {
		const { testcases, ...questionPayload } = payload;

		if (mode === 'create') {
			const response = await questionApi.create(questionPayload);
			const newId = response.question._id;
			if (testcases?.length) {
				await questionApi.batchSaveTestcases(newId, testcases);
			}
			navigate(`/admin/questions/${newId}`);
			return;
		}

		await questionApi.update(params.id, questionPayload);
		if (testcases) {
			await questionApi.batchSaveTestcases(params.id, testcases);
		}
		navigate(`/admin/questions/${params.id}`);
	};

	if (state.isLoading) {
		return <p>Loading question...</p>;
	}

	return (
		<main className="page-shell">
			<header className="page-header page-header--split">
				<div className="page-header__copy">
					<p className="page-kicker">Admin</p>
					<h1>{mode === 'create' ? 'Add question' : 'Edit question'}</h1>
					<p className="page-lead">
						Keep the statement, examples, and limits consistent before publishing the problem.
					</p>
				</div>
				<div className="page-header__actions">
					<Link to="/admin" className="page-button page-button--secondary">
						Back to list
					</Link>
				</div>
			</header>
			<section className="page-panel page-panel--form">
				{state.error ? <p className="empty-state empty-state--error">{state.error}</p> : null}
				<QuestionForm
					initialValue={state.question || undefined}
					onSubmit={handleSubmit}
					submitLabel={mode === 'create' ? 'Create question' : 'Save changes'}
				/>
			</section>
		</main>
	);
}