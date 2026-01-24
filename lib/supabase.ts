import { createClient } from '@supabase/supabase-js';
import { Question, Test } from './types';

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
  answer_layout?: 'grid' | 'list'; // 'grid' = 2x2, 'list' = 1x4 (default)
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
    answerLayout: dbQuestion.answer_layout || 'list',
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

// Fetch all unique topics from questions
export async function fetchAllTopics(): Promise<string[]> {
  const dbQuestions = await fetchQuestions();
  const topicsSet = new Set<string>();
  dbQuestions.forEach(q => {
    if (q.topics && Array.isArray(q.topics)) {
      q.topics.forEach(topic => topicsSet.add(topic));
    }
  });
  return Array.from(topicsSet).sort();
}

// =====================================================
// Tests Management
// =====================================================

// Type definition for database test
export interface DatabaseTest {
  id: string;
  name: string;
  description: string | null;
  scaled_score_table: { [key: string]: number } | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Type for test with question count
export interface DatabaseTestWithCount extends DatabaseTest {
  question_count?: number;
}

// Fetch all tests
export async function fetchTests(): Promise<DatabaseTestWithCount[]> {
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching tests:', error);
    return [];
  }

  // Get question counts for each test
  const testsWithCounts = await Promise.all(
    (data || []).map(async (test) => {
      const { count } = await supabase
        .from('test_questions')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', test.id);

      return {
        ...test,
        question_count: count || 0,
      };
    })
  );

  return testsWithCounts;
}

// Fetch active tests only (for students)
export async function fetchActiveTests(): Promise<DatabaseTestWithCount[]> {
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching active tests:', error);
    return [];
  }

  // Get question counts for each test
  const testsWithCounts = await Promise.all(
    (data || []).map(async (test) => {
      const { count } = await supabase
        .from('test_questions')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', test.id);

      return {
        ...test,
        question_count: count || 0,
      };
    })
  );

  return testsWithCounts;
}

// Fetch a single test by ID
export async function fetchTestById(testId: string): Promise<DatabaseTest | null> {
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('id', testId)
    .single();

  if (error) {
    console.error('Error fetching test:', error);
    return null;
  }

  return data;
}

// Create a new test
export async function createTest(test: {
  name: string;
  description?: string;
  scaled_score_table?: { [key: string]: number };
  is_active?: boolean;
}): Promise<DatabaseTest | null> {
  const { data, error } = await supabase
    .from('tests')
    .insert([{
      name: test.name,
      description: test.description || null,
      scaled_score_table: test.scaled_score_table || null,
      is_active: test.is_active ?? true,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating test:', error);
    return null;
  }

  return data;
}

// Update a test
export async function updateTest(
  id: string,
  updates: Partial<{
    name: string;
    description: string | null;
    scaled_score_table: { [key: string]: number } | null;
    is_active: boolean;
  }>
): Promise<DatabaseTest | null> {
  const { data, error } = await supabase
    .from('tests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating test:', error);
    return null;
  }

  return data;
}

// Delete a test
export async function deleteTest(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('tests')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting test:', error);
    return false;
  }

  return true;
}

// =====================================================
// Test-Questions Management
// =====================================================

// Fetch questions for a specific test
export async function fetchQuestionsForTest(testId: string): Promise<DatabaseQuestion[]> {
  const { data, error } = await supabase
    .from('test_questions')
    .select(`
      display_order,
      questions (*)
    `)
    .eq('test_id', testId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching questions for test:', error);
    return [];
  }

  // Extract questions from the joined data and sort by display_order
  const questions = (data || [])
    .map((tq: any) => ({
      ...tq.questions,
      display_order: tq.display_order,
    }))
    .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));

  return questions;
}

// Fetch questions for a test in quiz format
export async function fetchQuestionsForTestQuiz(testId: string): Promise<Question[]> {
  const dbQuestions = await fetchQuestionsForTest(testId);
  return dbQuestions.map(convertToQuizFormat);
}

// Add a question to a test
export async function addQuestionToTest(
  testId: string,
  questionId: string,
  displayOrder?: number
): Promise<boolean> {
  // If no display order provided, get the max and add 1
  let order = displayOrder;
  if (order === undefined) {
    const { data } = await supabase
      .from('test_questions')
      .select('display_order')
      .eq('test_id', testId)
      .order('display_order', { ascending: false })
      .limit(1);

    order = (data?.[0]?.display_order || 0) + 1;
  }

  const { error } = await supabase
    .from('test_questions')
    .insert([{
      test_id: testId,
      question_id: questionId,
      display_order: order,
    }]);

  if (error) {
    console.error('Error adding question to test:', error);
    return false;
  }

  return true;
}

// Remove a question from a test
export async function removeQuestionFromTest(
  testId: string,
  questionId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('test_questions')
    .delete()
    .eq('test_id', testId)
    .eq('question_id', questionId);

  if (error) {
    console.error('Error removing question from test:', error);
    return false;
  }

  return true;
}

// Update question order within a test
export async function updateTestQuestionOrders(
  testId: string,
  orders: { questionId: string; displayOrder: number }[]
): Promise<boolean> {
  const updates = orders.map(({ questionId, displayOrder }) =>
    supabase
      .from('test_questions')
      .update({ display_order: displayOrder })
      .eq('test_id', testId)
      .eq('question_id', questionId)
  );

  const results = await Promise.all(updates);
  const hasError = results.some((result) => result.error);

  if (hasError) {
    console.error('Error updating test question orders');
    return false;
  }

  return true;
}

// Get which tests a question belongs to
export async function getTestsForQuestion(questionId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('test_questions')
    .select('test_id')
    .eq('question_id', questionId);

  if (error) {
    console.error('Error fetching tests for question:', error);
    return [];
  }

  return (data || []).map((tq) => tq.test_id);
}

// Set which tests a question belongs to (replaces existing assignments)
export async function setTestsForQuestion(
  questionId: string,
  testIds: string[]
): Promise<boolean> {
  // First, remove all existing test assignments for this question
  const { error: deleteError } = await supabase
    .from('test_questions')
    .delete()
    .eq('question_id', questionId);

  if (deleteError) {
    console.error('Error removing existing test assignments:', deleteError);
    return false;
  }

  // Then, add the new test assignments
  if (testIds.length > 0) {
    const inserts = testIds.map((testId) => ({
      test_id: testId,
      question_id: questionId,
    }));

    const { error: insertError } = await supabase
      .from('test_questions')
      .insert(inserts);

    if (insertError) {
      console.error('Error adding test assignments:', insertError);
      return false;
    }
  }

  return true;
}

// Get all question-test mappings (for admin filtering)
export async function getAllQuestionTestMappings(): Promise<{ [questionId: string]: string[] }> {
  const { data, error } = await supabase
    .from('test_questions')
    .select('test_id, question_id');

  if (error) {
    console.error('Error fetching question-test mappings:', error);
    return {};
  }

  const mappings: { [questionId: string]: string[] } = {};
  (data || []).forEach((row) => {
    if (!mappings[row.question_id]) {
      mappings[row.question_id] = [];
    }
    mappings[row.question_id].push(row.test_id);
  });

  return mappings;
}

// Convert database test to app format
export function convertToTestFormat(dbTest: DatabaseTestWithCount): Test {
  return {
    id: dbTest.id,
    name: dbTest.name,
    description: dbTest.description || undefined,
    scaledScoreTable: dbTest.scaled_score_table
      ? Object.fromEntries(
          Object.entries(dbTest.scaled_score_table).map(([k, v]) => [parseInt(k), v])
        )
      : undefined,
    isActive: dbTest.is_active,
    questionCount: dbTest.question_count,
    createdAt: dbTest.created_at,
    updatedAt: dbTest.updated_at,
  };
}
