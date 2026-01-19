import { createClient } from '@supabase/supabase-js';
import { Question } from './types';

// Supabase client configuration
// Make sure to set these environment variables in .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Database Schema:
 *
 * Table: questions
 * - id: uuid (primary key)
 * - name: text (optional question name/title for admin identification)
 * - question_text: text (optional question text, can include LaTeX for math)
 * - question_image_url: text (URL to question image in storage, optional)
 * - reference_image_url: text (URL to reference image in storage, optional)
 * - answers: text[] (array of 4 answer choices)
 * - answer_image_urls: text[] (array of 4 optional image URLs for answer choices)
 * - correct_answer: integer (1-4)
 * - explanation_text: text
 * - explanation_image_url: text (optional)
 * - topics: text[] (array of topic strings)
 * - points: integer (points for this question, default: 1)
 * - display_order: integer (order of question in the quiz)
 * - created_at: timestamp
 * - updated_at: timestamp
 *
 * Storage Buckets:
 * - question-images: For question screenshot images
 * - reference-images: For reference images
 * - explanation-images: For explanation images (optional)
 * - answer-images: For answer option images (optional)
 */

// Type definition for database question
export interface DatabaseQuestion {
  id: string;
  name: string | null;
  question_text: string | null;
  question_image_url: string | null;
  reference_image_url: string | null;
  answers: string[]; // Array of 4 answer choices
  answer_image_urls?: (string | null)[]; // Optional array of 4 image URLs for answers
  correct_answer: number;
  explanation_text: string;
  explanation_image_url: string | null;
  topics: string[];
  points: number;
  display_order?: number;
  created_at: string;
  updated_at: string;
}

// Fetch all questions from database
export async function fetchQuestions(): Promise<DatabaseQuestion[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }

  return data || [];
}

// Upload image to Supabase storage
export async function uploadImage(
  bucket: string,
  file: File,
  path: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading image:', error);
    return null;
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return urlData.publicUrl;
}

// Create a new question
export async function createQuestion(question: Omit<DatabaseQuestion, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('questions')
    .insert([question])
    .select();

  if (error) {
    console.error('Error creating question:', error);
    return null;
  }

  return data?.[0] || null;
}

// Update an existing question
export async function updateQuestion(id: string, updates: Partial<DatabaseQuestion>) {
  const { data, error } = await supabase
    .from('questions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating question:', error);
    return null;
  }

  return data?.[0] || null;
}

// Delete a question
export async function deleteQuestion(id: string) {
  const { error } = await supabase.from('questions').delete().eq('id', id);

  if (error) {
    console.error('Error deleting question:', error);
    return false;
  }

  return true;
}

// Update the display order of multiple questions
export async function updateQuestionOrders(orders: { id: string; display_order: number }[]) {
  const updates = orders.map(({ id, display_order }) =>
    supabase
      .from('questions')
      .update({ display_order, updated_at: new Date().toISOString() })
      .eq('id', id)
  );

  const results = await Promise.all(updates);
  const hasError = results.some(result => result.error);

  if (hasError) {
    console.error('Error updating question orders');
    return false;
  }

  return true;
}

// Convert DatabaseQuestion to Question format for the quiz
export function convertToQuizFormat(dbQuestion: DatabaseQuestion): Question {
  return {
    id: dbQuestion.id,
    questionText: dbQuestion.question_text || undefined,
    imageFilename: dbQuestion.question_image_url || undefined,
    referenceImageUrl: dbQuestion.reference_image_url || undefined,
    answers: dbQuestion.answers,
    answerImageUrls: dbQuestion.answer_image_urls?.map(url => url || undefined),
    correctAnswer: dbQuestion.correct_answer,
    explanation: dbQuestion.explanation_text,
    explanationImageUrl: dbQuestion.explanation_image_url || undefined,
    topics: dbQuestion.topics,
    points: dbQuestion.points,
  };
}

// Fetch questions and convert to quiz format
export async function fetchQuestionsForQuiz(): Promise<Question[]> {
  const dbQuestions = await fetchQuestions();
  return dbQuestions.map(convertToQuizFormat);
}
