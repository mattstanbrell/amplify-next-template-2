"use client";
import { useState, useEffect, useCallback } from "react";
import {
	getCurrentUser,
	signInWithRedirect,
	signOut,
	fetchUserAttributes,
} from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import "./custom.scss";

Amplify.configure(outputs);
const client = generateClient<Schema>();

export default function App() {
	const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
	const [username, setUsername] = useState<string | null>(null);

	const listTodos = useCallback(() => {
		client.models.Todo.observeQuery().subscribe({
			next: (data) => setTodos([...data.items]),
		});
	}, []);

	const deleteTodo = useCallback((id: string) => {
		client.models.Todo.delete({ id });
	}, []);

	const checkUserAuthentication = useCallback(async () => {
		try {
			const currentUser = await getCurrentUser();
			console.log("currentUser", currentUser);
			if (currentUser) {
				const attributes = await fetchUserAttributes();
				const displayName =
					attributes.email || currentUser.username || currentUser.userId;
				setUsername(displayName);
				return true;
			}
		} catch (error) {
			console.error("Error getting current user:", error);
			setUsername(null);
			return false;
		}
	}, []);

	useEffect(() => {
		const fetchTodos = async () => {
			const isAuthenticated = await checkUserAuthentication();
			if (isAuthenticated) {
				listTodos();
			}
		};
		fetchTodos();
	}, [checkUserAuthentication, listTodos]);

	function createTodo() {
		client.models.Todo.create({
			content: window.prompt("Todo content"),
		});
	}

	const handleSignOut = async () => {
		await signOut();
		setUsername(null);
	};

	const handleKeyDown = (event: React.KeyboardEvent, callback: () => void) => {
		if (event.key === "Enter" || event.key === " ") {
			callback();
		}
	};

	return (
		<main className="govuk-width-container">
			<div className="govuk-main-wrapper">
				{username ? (
					<div>
						<h1 className="govuk-heading-xl">Welcome, {username}</h1>
						<h2 className="govuk-heading-l">My todos</h2>
						<button
							type="button"
							className="govuk-button"
							onClick={createTodo}
							onKeyDown={(e) => handleKeyDown(e, createTodo)}
						>
							+ New
						</button>
						<ul className="govuk-list app-todo-list">
							{todos.map((todo) => (
								<li key={todo.id} className="app-todo-list__item">
									<button
										type="button"
										className="govuk-button govuk-button--secondary"
										onClick={() => deleteTodo(todo.id)}
										onKeyDown={(e) =>
											handleKeyDown(e, () => deleteTodo(todo.id))
										}
									>
										{todo.content}
									</button>
								</li>
							))}
						</ul>
						<div>
							<p className="govuk-body">
								App successfully hosted. Try creating a new todo.
							</p>
							<button
								type="button"
								className="govuk-button govuk-button--warning"
								onClick={handleSignOut}
								onKeyDown={(e) => handleKeyDown(e, handleSignOut)}
							>
								Sign out
							</button>
						</div>
					</div>
				) : (
					<div className="app-sign-in">
						<button
							type="button"
							className="govuk-button"
							data-module="govuk-button"
							onClick={() =>
								signInWithRedirect({
									provider: { custom: "MicrosoftEntraID" },
								})
							}
							onKeyDown={(e) =>
								handleKeyDown(e, () =>
									signInWithRedirect({
										provider: { custom: "MicrosoftEntraID" },
									}),
								)
							}
						>
							Sign in
						</button>
					</div>
				)}
			</div>
		</main>
	);
}
