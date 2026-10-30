import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ContactsListsRows } from "./ContactList.new";

const renderRow = (isSystem: boolean) => {
  const onView = jest.fn();
  const onDownload = jest.fn();
  render(<ContactsListsRows
    data={[{ id: -2, name: "Unsubscribe", isSystem }]}
    isLoading={false} sortKey="name" sortDirection="asc"
    onSort={jest.fn()} actionsAnchor="-2" setActionsAnchor={jest.fn()}
    onRowClick={jest.fn()} onRename={jest.fn()} onView={onView}
    onDownload={onDownload} onDelete={jest.fn()} isDemoAccount={false}
    formatDate={() => "—"}
  />);
  return { onView, onDownload };
};

test("system view allows viewing and downloading but hides rename and delete", () => {
  const { onView, onDownload } = renderRow(true);
  expect(screen.queryByRole("button", { name: /rename/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^view$/i }));
  fireEvent.click(screen.getByRole("button", { name: /download/i }));
  expect(onView).toHaveBeenCalledTimes(1);
  expect(onDownload).toHaveBeenCalledTimes(1);
});

test("ordinary views retain rename and delete", () => {
  renderRow(false);
  expect(screen.getByRole("button", { name: /rename/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
});
