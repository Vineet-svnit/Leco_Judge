import { Navigate, useParams } from 'react-router-dom';

import { AppNavbar } from '../../shared/components/AppNavbar.jsx';
import { useQuestion } from '../hooks/useQuestion.js';

export default function QuestionDetailPage({ user, logout }) {
	if (!user) {
		return <Navigate to="/login" replace />;
	}

	return <QuestionDetailContent user={user} logout={logout} />;
}


function QuestionDetailContent({ user, logout }) {
	const { id } = useParams();
	const { question, isLoading, error } = useQuestion(id);

	return (
		<main className="page-shell">
			<AppNavbar user={user} onLogout={logout} />
			<section className="page-panel page-panel--detail">
				<p className="page-kicker">Question details</p>
				{isLoading ? <p className="empty-state">Loading question...</p> : null}
				{error ? <p className="empty-state empty-state--error">{error}</p> : null}

				{question ? (
					<article className="question-detail">
						<div className="question-detail__top">
							<div>
								<h1>{question.title}</h1>
								<p className="question-detail__meta">
									<span className={`status-chip status-chip--${question.difficulty.toLowerCase()}`}>
										{question.difficulty}
									</span>
									<span>{question.topic || 'No topic yet'}</span>
									<span>{question.timeLimit ?? '-'} ms</span>
									<span>{question.memoryLimit ?? '-'} MB</span>
								</p>
							</div>
							{question.image ? (
								<img className="question-detail__image" src={question.image} alt={question.title} />
							) : null}
						</div>

						<div className="question-detail__statement">
							<p>{question.statement}</p>
						</div>

						<section className="question-detail__examples">
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
										{example.explanation ? <p className="example-explanation">{example.explanation}</p> : null}
									</article>
								))
							) : (
								<p className="empty-state">No examples added yet.</p>
							)}
						</section>
					</article>
				) : null}
			</section>
		</main>
	);
}