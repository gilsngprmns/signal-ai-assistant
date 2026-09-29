import useAuth from "../hooks/useAuth.js";

export default function Profile() {
	const { user } = useAuth();
	return (
		<main className="workspace-content page-content">
			<div className="page-heading"><div><p className="eyebrow">ACCOUNT</p><h1>Profile</h1></div></div>
			<section className="profile-panel">
				<div className="profile-avatar">{user?.name?.trim()?.[0]?.toUpperCase() || "U"}</div>
			<dl><div><dt>Name</dt><dd>{user?.name}</dd></div><div><dt>Email</dt><dd>{user?.email}</dd></div><div><dt>Role</dt><dd>{user?.role}</dd></div></dl>
			</section>
		</main>
	);
}