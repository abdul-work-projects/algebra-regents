import { createClient } from '@supabase/supabase-js';
import { Question, Test, Subject } from './types';

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
  student_friendly_skill: string | null;
  cluster: string | null;
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

// Bulk create questions
export async function bulkCreateQuestions(questions: Omit<DatabaseQuestion, 'id' | 'created_at' | 'updated_at'>[]) {
  const { data, error } = await supabase
    .from('questions')
    .insert(questions)
    .select();

  if (error) {
    console.error('Error bulk creating questions:', error);
    return { success: false, error: error.message, data: null };
  }

  return { success: true, error: null, data };
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

// Delete all questions assigned to a test
export async function deleteQuestionsForTest(testId: string): Promise<{ success: boolean; count: number }> {
  // First get all question IDs for this test
  const { data: testQuestions, error: fetchError } = await supabase
    .from('test_questions')
    .select('question_id')
    .eq('test_id', testId);

  if (fetchError) {
    console.error('Error fetching test questions:', fetchError);
    return { success: false, count: 0 };
  }

  if (!testQuestions || testQuestions.length === 0) {
    return { success: true, count: 0 };
  }

  const questionIds = testQuestions.map(tq => tq.question_id);

  // Delete all questions (this will cascade delete test_questions entries)
  const { error: deleteError } = await supabase
    .from('questions')
    .delete()
    .in('id', questionIds);

  if (deleteError) {
    console.error('Error deleting questions:', deleteError);
    return { success: false, count: 0 };
  }

  return { success: true, count: questionIds.length };
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

// Update the display order of questions within a specific test
export async function updateTestQuestionOrders(testId: string, orders: { questionId: string; display_order: number }[]) {
  const updates = orders.map(({ questionId, display_order }) =>
    supabase
      .from('test_questions')
      .update({ display_order })
      .eq('test_id', testId)
      .eq('question_id', questionId)
  );

  const results = await Promise.all(updates);
  const hasError = results.some(result => result.error);

  if (hasError) {
    console.error('Error updating test question orders');
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
    studentFriendlySkill: dbQuestion.student_friendly_skill || undefined,
    cluster: dbQuestion.cluster || undefined,
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
  subject_id: string;
  created_at: string;
  updated_at: string;
}

// Type for test with question count and subject info
export interface DatabaseTestWithCount extends DatabaseTest {
  question_count?: number;
  subject_name?: string;
}

// Type definition for database subject
export interface DatabaseSubject {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Type for subject with test count
export interface DatabaseSubjectWithCount extends DatabaseSubject {
  test_count?: number;
  question_count?: number;
}

// Fetch all tests
export async function fetchTests(): Promise<DatabaseTestWithCount[]> {
  const { data, error } = await supabase
    .from('tests')
    .select(`
      *,
      subjects (name)
    `)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching tests:', error);
    return [];
  }

  // Get question counts for each test
  const testsWithCounts = await Promise.all(
    (data || []).map(async (test: any) => {
      const { count } = await supabase
        .from('test_questions')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', test.id);

      return {
        ...test,
        subject_name: test.subjects?.name || undefined,
        subjects: undefined, // Remove the nested object
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
    .select(`
      *,
      subjects (name)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching active tests:', error);
    return [];
  }

  // Get question counts for each test
  const testsWithCounts = await Promise.all(
    (data || []).map(async (test: any) => {
      const { count } = await supabase
        .from('test_questions')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', test.id);

      return {
        ...test,
        subject_name: test.subjects?.name || undefined,
        subjects: undefined, // Remove the nested object
        question_count: count || 0,
      };
    })
  );

  return testsWithCounts;
}

// Fetch active tests for a specific subject (for students)
export async function fetchActiveTestsForSubject(subjectId: string): Promise<DatabaseTestWithCount[]> {
  const { data, error } = await supabase
    .from('tests')
    .select(`
      *,
      subjects (name)
    `)
    .eq('is_active', true)
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching active tests for subject:', error);
    return [];
  }

  // Get question counts for each test
  const testsWithCounts = await Promise.all(
    (data || []).map(async (test: any) => {
      const { count } = await supabase
        .from('test_questions')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', test.id);

      return {
        ...test,
        subject_name: test.subjects?.name || undefined,
        subjects: undefined,
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
  subject_id: string;
}): Promise<DatabaseTest | null> {
  const { data, error } = await supabase
    .from('tests')
    .insert([{
      name: test.name,
      description: test.description || null,
      scaled_score_table: test.scaled_score_table || null,
      is_active: test.is_active ?? true,
      subject_id: test.subject_id,
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
    subject_id: string;
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

  // Then, add the new test assignments with proper display_order
  if (testIds.length > 0) {
    // Get max display_order for each test and add questions at the end
    const inserts = await Promise.all(
      testIds.map(async (testId) => {
        const { data } = await supabase
          .from('test_questions')
          .select('display_order')
          .eq('test_id', testId)
          .order('display_order', { ascending: false })
          .limit(1);

        const nextOrder = (data?.[0]?.display_order || 0) + 1;

        return {
          test_id: testId,
          question_id: questionId,
          display_order: nextOrder,
        };
      })
    );

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
    subjectId: dbTest.subject_id,
    subjectName: dbTest.subject_name || undefined,
    questionCount: dbTest.question_count,
    createdAt: dbTest.created_at,
    updatedAt: dbTest.updated_at,
  };
}

// =====================================================
// Subjects Management
// =====================================================

// Fetch all subjects with test counts
export async function fetchSubjects(): Promise<DatabaseSubjectWithCount[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching subjects:', error);
    return [];
  }

  // Get test counts for each subject
  const subjectsWithCounts = await Promise.all(
    (data || []).map(async (subject) => {
      const { count } = await supabase
        .from('tests')
        .select('*', { count: 'exact', head: true })
        .eq('subject_id', subject.id);

      return {
        ...subject,
        test_count: count || 0,
      };
    })
  );

  return subjectsWithCounts;
}

// Fetch active subjects only (for students)
export async function fetchActiveSubjects(): Promise<DatabaseSubjectWithCount[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching active subjects:', error);
    return [];
  }

  // Get test counts for each subject (only active tests)
  const subjectsWithCounts = await Promise.all(
    (data || []).map(async (subject) => {
      const { count } = await supabase
        .from('tests')
        .select('*', { count: 'exact', head: true })
        .eq('subject_id', subject.id)
        .eq('is_active', true);

      return {
        ...subject,
        test_count: count || 0,
      };
    })
  );

  return subjectsWithCounts;
}

// Create a new subject
export async function createSubject(subject: {
  name: string;
  description?: string;
  color?: string;
  is_active?: boolean;
  display_order?: number;
}): Promise<DatabaseSubject | null> {
  const { data, error } = await supabase
    .from('subjects')
    .insert([{
      name: subject.name,
      description: subject.description || null,
      color: subject.color || '#3B82F6',
      is_active: subject.is_active ?? true,
      display_order: subject.display_order ?? 0,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating subject:', error);
    return null;
  }

  return data;
}

// Update a subject
export async function updateSubject(
  id: string,
  updates: Partial<{
    name: string;
    description: string | null;
    color: string;
    is_active: boolean;
    display_order: number;
  }>
): Promise<DatabaseSubject | null> {
  const { data, error } = await supabase
    .from('subjects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating subject:', error);
    return null;
  }

  return data;
}

// Delete a subject (will fail if subject has tests due to FK constraint)
export async function deleteSubject(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting subject:', error);
    return false;
  }

  return true;
}

// Convert database subject to app format
export function convertToSubjectFormat(dbSubject: DatabaseSubjectWithCount): Subject {
  return {
    id: dbSubject.id,
    name: dbSubject.name,
    description: dbSubject.description || undefined,
    color: dbSubject.color,
    isActive: dbSubject.is_active,
    displayOrder: dbSubject.display_order,
    testCount: dbSubject.test_count,
    questionCount: dbSubject.question_count,
    createdAt: dbSubject.created_at,
    updatedAt: dbSubject.updated_at,
  };
}

// =====================================================
// Helper Functions for New Question Fields
// =====================================================

// Fetch all unique clusters from questions
export async function fetchAllClusters(): Promise<string[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('cluster')
    .not('cluster', 'is', null);

  if (error) {
    console.error('Error fetching clusters:', error);
    return [];
  }

  const clustersSet = new Set<string>();
  (data || []).forEach((q) => {
    if (q.cluster) {
      clustersSet.add(q.cluster);
    }
  });
  return Array.from(clustersSet).sort();
}

// Fetch all unique student-friendly skills from questions
export async function fetchAllSkills(): Promise<string[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('student_friendly_skill')
    .not('student_friendly_skill', 'is', null);

  if (error) {
    console.error('Error fetching skills:', error);
    return [];
  }

  const skillsSet = new Set<string>();
  (data || []).forEach((q) => {
    if (q.student_friendly_skill) {
      skillsSet.add(q.student_friendly_skill);
    }
  });
  return Array.from(skillsSet).sort();
}

// Fetch questions for a specific subject (via test associations)
export async function fetchQuestionsForSubject(subjectId: string): Promise<Question[]> {
  // First get all test IDs for this subject
  const { data: tests, error: testsError } = await supabase
    .from('tests')
    .select('id')
    .eq('subject_id', subjectId)
    .eq('is_active', true);

  if (testsError) {
    console.error('Error fetching tests for subject:', testsError);
    return [];
  }

  if (!tests || tests.length === 0) {
    return [];
  }

  const testIds = tests.map(t => t.id);

  // Get all question IDs for these tests
  const { data: testQuestions, error: tqError } = await supabase
    .from('test_questions')
    .select('question_id')
    .in('test_id', testIds);

  if (tqError) {
    console.error('Error fetching test questions:', tqError);
    return [];
  }

  if (!testQuestions || testQuestions.length === 0) {
    return [];
  }

  const questionIds = [...new Set(testQuestions.map(tq => tq.question_id))];

  // Fetch the actual questions
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('*')
    .in('id', questionIds);

  if (qError) {
    console.error('Error fetching questions:', qError);
    return [];
  }

  return (questions || []).map(convertToQuizFormat);
}

// Get subject ID for a question (via test association)
export async function getSubjectForQuestion(questionId: string): Promise<string | null> {
  // Get test for this question
  const { data: testQuestion, error: tqError } = await supabase
    .from('test_questions')
    .select('test_id')
    .eq('question_id', questionId)
    .limit(1)
    .single();

  if (tqError || !testQuestion) {
    return null;
  }

  // Get subject for this test
  const { data: test, error: testError } = await supabase
    .from('tests')
    .select('subject_id')
    .eq('id', testQuestion.test_id)
    .single();

  if (testError || !test) {
    return null;
  }

  return test.subject_id;
}
