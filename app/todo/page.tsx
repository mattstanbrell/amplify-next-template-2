// app/todo/page.tsx
"use client";

import { getCurrentUser } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import type { AuthUser } from "@aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

export default function TodoPage() {
	const router = useRouter();
	const [user, setUser] = useState<AuthUser | null>(null);
	const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);

	const listTodos = useCallback(() => {
		client.models.Todo.observeQuery().subscribe({
			next: (data) => setTodos([...data.items]),
		});
	}, []);

	const deleteTodo = useCallback((id: string) => {
		client.models.Todo.delete({ id });
	}, []);

	useEffect(() => {
		getCurrentUser()
			.then((currentUser) => {
				setUser(currentUser);
				listTodos();
			})
			.catch(() => router.push("/"));
	}, [router, listTodos]);

	function createTodo() {
		const content = window.prompt("Todo content");
		if (content) {
			client.models.Todo.create({
				content,
			});
		}
	}

	const handleKeyDown = (event: React.KeyboardEvent, callback: () => void) => {
		if (event.key === "Enter" || event.key === " ") {
			callback();
		}
	};

	if (!user)
		return (
			<div className="govuk-width-container">
				<div className="govuk-grid-row">
					<div className="govuk-grid-column-full">
						<section
							className="govuk-notification-banner"
							aria-labelledby="govuk-notification-banner-title"
						>
							<div className="govuk-notification-banner__header">
								<h2
									className="govuk-notification-banner__title"
									id="govuk-notification-banner-title"
								>
									Loading
								</h2>
							</div>
							<div className="govuk-notification-banner__content">
								<p className="govuk-notification-banner__heading">
									Please wait while we load your information...
								</p>
							</div>
						</section>
					</div>
				</div>
			</div>
		);

	return (
		<main className="govuk-main-wrapper">
			<div className="govuk-width-container">
				<div className="govuk-grid-row">
					<div className="govuk-grid-column-two-thirds">
						<h1 className="govuk-heading-xl">Todo List</h1>
						<p className="govuk-body">Welcome {user.username}</p>

						<button
							type="button"
							className="govuk-button"
							onClick={createTodo}
							onKeyDown={(e) => handleKeyDown(e, createTodo)}
						>
							+ New Todo
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

						{todos.length === 0 && (
							<div className="govuk-inset-text">
								No todos yet. Create one to get started!
							</div>
						)}
					</div>
				</div>
			</div>
		</main>
	);
}
