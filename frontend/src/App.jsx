import { Navigate, Route, Routes } from 'react-router-dom';

import AuthPage from './features/auth/pages/AuthPage.jsx';
import { useAuthSession } from './features/auth/hooks/useAuthSession.js';
import AdminPage, {
	AdminHome,
	QuestionEditorPage,
} from './features/admin/pages/AdminPage.jsx';
import DashboardPage from './features/dashboard/pages/DashboardPage.jsx';
import QuestionDetailPage from './features/questions/pages/QuestionDetailPage.jsx';

function App() {
	const { user, isLoading, error, loginUrl, logout } = useAuthSession();

	if (isLoading) {
		return null;
	}

	return (
		<Routes>
			<Route
				path="/login"
				element={user ? <Navigate to="/" replace /> : <AuthPage error={error} loginUrl={loginUrl} />}
			/>
			<Route path="/" element={<DashboardPage user={user} logout={logout} />} />
			<Route path="/questions/:id" element={<QuestionDetailPage user={user} logout={logout} />} />
			<Route path="/admin" element={<AdminPage user={user} />}>
				<Route index element={<AdminHome />} />
				<Route path="questions/new" element={<QuestionEditorPage mode="create" />} />
				<Route path="questions/:id" element={<QuestionEditorPage mode="edit" />} />
			</Route>
			<Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
		</Routes>
	);
}

export default App;