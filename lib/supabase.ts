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
 * - question_image_url: text (URL to question image in storage)
 * - reference_image_url: text (URL to reference image in storage, optional)
 * - answers: text[] (array of 4 answer choices)
 * - correct_answer: integer (1-4)
 * - explanation_text: text
 * - explanation_image_url: text (optional)
 * - topics: text[] (array of topic strings)
 * - created_at: timestamp
 * - updated_at: timestamp
 *
 * Storage Buckets:
 * - question-images: For question screenshot images
 * - reference-images: For reference images
 * - explanation-images: For explanation images (optional)
 */

// Type definition for database question
export interface DatabaseQuestion {
  id: string;
  name: string | null;
  question_image_url: string;
  reference_image_url: string | null;
  answers: string[]; // Array of 4 answer choices
  correct_answer: number;
  explanation_text: string;
  explanation_image_url: string | null;
  topics: string[];
  created_at: string;
  updated_at: string;
}

// Fetch all questions from database
export async function fetchQuestions(): Promise<DatabaseQuestion[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
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

// Convert DatabaseQuestion to Question format for the quiz
export function convertToQuizFormat(dbQuestion: DatabaseQuestion): Question {
  return {
    id: dbQuestion.id,
    imageFilename: dbQuestion.question_image_url,
    referenceImageUrl: dbQuestion.reference_image_url || undefined,
    answers: dbQuestion.answers,
    correctAnswer: dbQuestion.correct_answer,
    explanation: dbQuestion.explanation_text,
    explanationImageUrl: dbQuestion.explanation_image_url || undefined,
    topics: dbQuestion.topics,
  };
}

// Fetch questions and convert to quiz format
export async function fetchQuestionsForQuiz(): Promise<Question[]> {
  const dbQuestions = await fetchQuestions();
  return dbQuestions.map(convertToQuizFormat);
}
