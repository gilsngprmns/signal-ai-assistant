import {
  deleteConversation,
  getConversationWithMessages,
  listConversations,
  } from "../repositories/conversation.repository.js";
import { createUserConversation, updateUserConversation } from "../services/chat.service.js";

export async function create(req, res, next) {
  try {
  const conversation = await createUserConversation(req.user.id, req.body.mode ?? "general");
    return res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    return next(error);
  }
}

export async function list(req, res, next) {
  try {
    const conversations = await listConversations(req.user.id);
    return res.json({ success: true, data: conversations });
  } catch (error) {
    return next(error);
  }
}

export async function getById(req, res, next) {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ success: false, message: "Conversation ID is invalid" });
  }
  try {
    const conversation = await getConversationWithMessages(req.params.id, req.user.id);
    if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found" });
    return res.json({ success: true, data: conversation });
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ success: false, message: "Conversation ID is invalid" });
  }
  try {
    const deleted = await deleteConversation(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Conversation not found" });
    return res.json({ success: true, message: "Conversation deleted", data: {} });
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ success: false, message: "Conversation ID is invalid" });
  }
  if (!Object.hasOwn(req.body, "title") && !Object.hasOwn(req.body, "mode")) {
    return res.status(400).json({ success: false, message: "Provide a title or mode to update" });
  }
  if (req.body.title !== undefined && typeof req.body.title !== "string") {
    return res.status(400).json({ success: false, message: "Title must be a string" });
  }
  try {
    const conversation = await updateUserConversation(req.user.id, req.params.id, req.body);
    return res.json({ success: true, data: conversation });
  } catch (error) {
    return next(error);
  }
}

export async function getMessages(req, res, next) {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ success: false, message: "Conversation ID is invalid" });
  }
  try {
    const conversation = await getConversationWithMessages(req.params.id, req.user.id);
    if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found" });
    return res.json({ success: true, data: conversation.messages });
  } catch (error) {
    return next(error);
  }
}