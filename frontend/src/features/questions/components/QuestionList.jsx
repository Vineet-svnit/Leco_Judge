import { Link } from 'react-router-dom';

// Strip HTML tags produced by Quill for plain-text display in list cards
const stripHtml = (html = '') => html.replace(/<[^>]*>/g, '').trim();

export const QuestionList = ({ questions, basePath = '/questions' }) => {
	return (
		<ul className="question-list">
			{questions.map((question) => (
				<li key={question._id} className="question-list-item">
					<Link to={`${basePath}/${question._id}`} className="question-link">
						<div>
							<h3>{stripHtml(question.title)}</h3>
							<p>{stripHtml(question.topic) || 'No topic yet'}</p>
						</div>
						<span>{question.difficulty}</span>
					</Link>
				</li>
			))}
		</ul>
	);
};