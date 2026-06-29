import { Link } from 'react-router-dom';

// Strip HTML tags and decode entities (e.g. &nbsp; → space) from Quill output
const stripHtml = (html = '') => {
	const div = document.createElement('div');
	div.innerHTML = html;
	return (div.textContent || div.innerText || '').trim();
};

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
