import { Link } from 'react-router-dom';

export const QuestionList = ({ questions, basePath = '/questions' }) => {
	return (
		<ul className="question-list">
			{questions.map((question) => (
				<li key={question._id} className="question-list-item">
					<Link to={`${basePath}/${question._id}`} className="question-link">
						<div>
							<h3>{question.title}</h3>
							<p>{question.topic || 'No topic yet'}</p>
						</div>
						<span>{question.difficulty}</span>
					</Link>
				</li>
			))}
		</ul>
	);
};