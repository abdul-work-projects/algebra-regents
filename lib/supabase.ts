import { createClient } from '@supabase/supabase-js';
import { Question, Test, TestSection, Subject, Passage, QuestionDocument } from './types';

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

// Type definition for database passage (shared context for grouped questions)
export interface DatabasePassage {
  id: string;
  type: 'grouped' | 'parts';
  above_text: string | null;
  passage_text: string | null;
  passage_image_url: string | null;
  iframe_url: string | null;
  iframe_page: number | null;
  passage_documents?: QuestionDocument[] | null;
  image_size: 'small' | 'medium' | 'large' | 'extra-large' | null;
  created_at: string;
  updated_at: string;
}

// Type definition for database question
export interface DatabaseQuestion {
  id: string;
  name: string | null;
  question_text: string | null;
  above_image_text: string | null; // Text displayed above the question image
  question_image_url: string | null;        // legacy
  reference_image_url: string | null;       // legacy
  question_documents?: QuestionDocument[] | null;
  reference_documents?: QuestionDocument[] | null;
  answers: string[]; // Array of answer choices
  answer_image_urls?: (string | null)[]; // Optional array of image URLs for answers
  answer_layout?: 'grid' | 'list' | 'row'; // 'grid' = 2x2, 'list' = 1x4 (default), 'row' = 4x1
  image_size?: 'small' | 'medium' | 'large' | 'extra-large'; // Display size for question image
  question_type: string; // 'multiple-choice' or 'drag-order'
  correct_answer: number; // 1-4 (ignored for drag-order)
  explanation_text: string;
  explanation_image_url: string | null;
  skills: string[]; // Skills tested (renamed from topics)
  tags: string[]; // Broader categorization tags
  difficulty: 'easy' | 'medium' | 'hard' | null; // Question difficulty level
  points: number;
  notes: string | null; // Admin notes for this question
  passage_id: string | null; // Reference to shared passage
  display_order?: number;
  created_at: string;
  updated_at: string;
}

// Type definition for database test section
export interface DatabaseTestSection {
  id: string;
  test_id: string;
  name: string;
  description: string | null;
  reference_image_url: string | null;       // legacy
  reference_documents?: QuestionDocument[] | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Lightweight question type for list views (omits heavy fields)
export type LightweightQuestion = Pick<DatabaseQuestion,
  'id' | 'name' | 'question_text' | 'question_image_url' | 'skills' | 'tags' | 'difficulty' | 'points' | 'passage_id' | 'display_order' | 'created_at' | 'updated_at'
> & { passages?: DatabasePassage | null };

// Fetch all questions from database (with passage data)
export async function fetchQuestions(): Promise<(DatabaseQuestion & { passages?: DatabasePassage | null })[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*, passages (*)')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }

  return data || [];
}

// Fetch questions with only columns needed for the admin list view (much faster)
export async function fetchQuestionsLightweight(): Promise<LightweightQuestion[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('id, name, question_text, question_image_url, skills, tags, difficulty, points, passage_id, display_order, created_at, updated_at, passages (*)')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching questions (lightweight):', error);
    return [];
  }

  return (data || []) as unknown as LightweightQuestion[];
}

// Fetch a single question by ID (full data for editing)
export async function fetchQuestionById(id: string): Promise<(DatabaseQuestion & { passages?: DatabasePassage | null }) | null> {
  const { data, error } = await supabase
    .from('questions')
    .select('*, passages (*)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching question by id:', error);
    return null;
  }

  return data;
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
    console.error('Error updating question orders:', results.filter(r => r.error).map(r => r.error));
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
// Coerce a stored docs array (may be undefined / null / non-array from older rows) into a typed array.
function coerceDocs(value: unknown): QuestionDocument[] {
  if (!Array.isArray(value)) return [];
  return value.filter((d): d is QuestionDocument =>
    !!d && typeof d === 'object' &&
    typeof (d as QuestionDocument).type === 'string' &&
    typeof (d as QuestionDocument).url === 'string'
  );
}

export function convertToQuizFormat(dbQuestion: DatabaseQuestion & { passages?: DatabasePassage | null }, sectionInfo?: { sectionId?: string; sectionName?: string }): Question {
  return {
    id: dbQuestion.id,
    questionText: dbQuestion.question_text || undefined,
    aboveImageText: dbQuestion.above_image_text || undefined,
    questionDocuments: coerceDocs(dbQuestion.question_documents),
    referenceDocuments: coerceDocs(dbQuestion.reference_documents),
    answers: dbQuestion.answers,
    answerImageUrls: dbQuestion.answer_image_urls?.map(url => url || undefined),
    answerLayout: dbQuestion.answer_layout || 'list',
    imageSize: dbQuestion.image_size || 'large',
    questionType: (dbQuestion.question_type as 'multiple-choice' | 'drag-order') || 'multiple-choice',
    correctAnswer: dbQuestion.correct_answer,
    explanation: dbQuestion.explanation_text,
    explanationImageUrl: dbQuestion.explanation_image_url || undefined,
    skills: dbQuestion.skills || [],
    tags: dbQuestion.tags || [],
    difficulty: dbQuestion.difficulty,
    notes: dbQuestion.notes || undefined,
    points: dbQuestion.points,
    passageId: dbQuestion.passage_id || undefined,
    passage: dbQuestion.passages ? {
      id: dbQuestion.passages.id,
      type: dbQuestion.passages.type || 'grouped',
      aboveText: dbQuestion.passages.above_text || undefined,
      passageText: dbQuestion.passages.passage_text || undefined,
      passageDocuments: coerceDocs(dbQuestion.passages.passage_documents),
      imageSize: dbQuestion.passages.image_size || 'large',
    } : undefined,
    sectionId: sectionInfo?.sectionId,
    sectionName: sectionInfo?.sectionName,
  };
}

// Fetch questions and convert to quiz format
export async function fetchQuestionsForQuiz(): Promise<Question[]> {
  const dbQuestions = await fetchQuestions();
  return dbQuestions.map(q => convertToQuizFormat(q));
}

// Extract unique skills from questions (accepts pre-fetched questions to avoid redundant fetch)
export function extractSkillNames(dbQuestions: DatabaseQuestion[]): string[] {
  const skillsSet = new Set<string>();
  dbQuestions.forEach(q => {
    if (q.skills && Array.isArray(q.skills)) {
      q.skills.forEach(skill => skillsSet.add(skill));
    }
  });
  return Array.from(skillsSet).sort();
}

// Extract unique tags from questions (accepts pre-fetched questions to avoid redundant fetch)
export function extractTags(dbQuestions: DatabaseQuestion[]): string[] {
  const tagsSet = new Set<string>();
  dbQuestions.forEach(q => {
    if (q.tags && Array.isArray(q.tags)) {
      q.tags.forEach(tag => tagsSet.add(tag));
    }
  });
  return Array.from(tagsSet).sort();
}

// Fetch all unique skills from questions (legacy, fetches questions itself)
export async function fetchAllSkillNames(): Promise<string[]> {
  return extractSkillNames(await fetchQuestions());
}

// Fetch all unique tags from questions (legacy, fetches questions itself)
export async function fetchAllTags(): Promise<string[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('tags');

  if (error) {
    console.error('Error fetching tags:', error);
    return [];
  }

  const tagsSet = new Set<string>();
  (data || []).forEach((q: { tags: string[] | null }) => {
    if (q.tags && Array.isArray(q.tags)) {
      q.tags.forEach(tag => tagsSet.add(tag));
    }
  });
  return Array.from(tagsSet).sort();
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
  const [testsResult, countsResult] = await Promise.all([
    supabase
      .from('tests')
      .select(`*, subjects (name)`)
      .order('created_at', { ascending: true }),
    supabase
      .from('test_questions')
      .select('test_id'),
  ]);

  if (testsResult.error) {
    console.error('Error fetching tests:', testsResult.error);
    return [];
  }

  // Count questions per test from the flat list
  const countMap: Record<string, number> = {};
  if (countsResult.data) {
    for (const row of countsResult.data) {
      countMap[row.test_id] = (countMap[row.test_id] || 0) + 1;
    }
  }

  return (testsResult.data || []).map((test: any) => ({
    ...test,
    subject_name: test.subjects?.name || undefined,
    subjects: undefined,
    question_count: countMap[test.id] || 0,
  }));
}

// Fetch active tests only (for students)
export async function fetchActiveTests(): Promise<DatabaseTestWithCount[]> {
  const [testsResult, countsResult] = await Promise.all([
    supabase
      .from('tests')
      .select('*, subjects (name)')
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('test_questions')
      .select('test_id'),
  ]);

  if (testsResult.error) {
    console.error('Error fetching active tests:', testsResult.error);
    return [];
  }

  // Count questions per test from the flat list
  const countMap: Record<string, number> = {};
  if (countsResult.data) {
    for (const row of countsResult.data) {
      countMap[row.test_id] = (countMap[row.test_id] || 0) + 1;
    }
  }

  return (testsResult.data || []).map((test: any) => ({
    ...test,
    subject_name: test.subjects?.name || undefined,
    subjects: undefined,
    question_count: countMap[test.id] || 0,
  }));
}

// Fetch active tests for a specific subject (for students)
export async function fetchActiveTestsForSubject(subjectId: string): Promise<DatabaseTestWithCount[]> {
  const [testsResult, countsResult] = await Promise.all([
    supabase
      .from('tests')
      .select('*, subjects (name)')
      .eq('is_active', true)
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: true }),
    supabase
      .from('test_questions')
      .select('test_id'),
  ]);

  if (testsResult.error) {
    console.error('Error fetching active tests for subject:', testsResult.error);
    return [];
  }

  const countMap: Record<string, number> = {};
  if (countsResult.data) {
    for (const row of countsResult.data) {
      countMap[row.test_id] = (countMap[row.test_id] || 0) + 1;
    }
  }

  return (testsResult.data || []).map((test: any) => ({
    ...test,
    subject_name: test.subjects?.name || undefined,
    subjects: undefined,
    question_count: countMap[test.id] || 0,
  }));
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

// Fetch questions for a specific test (with passage and section data)
export async function fetchQuestionsForTest(testId: string): Promise<(DatabaseQuestion & { passages?: DatabasePassage | null; _sectionId?: string; _sectionName?: string })[]> {
  const { data, error } = await supabase
    .from('test_questions')
    .select(`
      display_order,
      section_id,
      test_sections (id, name, description, display_order, reference_image_url, reference_documents),
      questions (
        *,
        passages (*)
      )
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
      _sectionId: tq.section_id || undefined,
      _sectionName: tq.test_sections?.name || undefined,
    }))
    .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));

  return questions;
}

// Fetch questions for a test in quiz format (with section info)
export async function fetchQuestionsForTestQuiz(testId: string): Promise<Question[]> {
  const dbQuestions = await fetchQuestionsForTest(testId);
  return dbQuestions.map((q: any) => convertToQuizFormat(q, {
    sectionId: q._sectionId,
    sectionName: q._sectionName,
  }));
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
  // Fetch existing assignments so we can preserve display_order for tests that stay
  const { data: existing, error: fetchError } = await supabase
    .from('test_questions')
    .select('test_id, display_order, section_id')
    .eq('question_id', questionId);

  if (fetchError) {
    console.error('Error fetching existing test assignments:', fetchError);
    return false;
  }

  const existingMap = new Map(
    (existing || []).map((row) => [row.test_id, row])
  );

  const testsToRemove = (existing || [])
    .filter((row) => !testIds.includes(row.test_id))
    .map((row) => row.test_id);

  const testsToAdd = testIds.filter((id) => !existingMap.has(id));
  const testsKept = testIds.filter((id) => existingMap.has(id));

  // Remove only the tests that were un-checked
  if (testsToRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('test_questions')
      .delete()
      .eq('question_id', questionId)
      .in('test_id', testsToRemove);

    if (deleteError) {
      console.error('Error removing test assignments:', deleteError);
      return false;
    }
  }

  // Insert only newly added tests at the end
  if (testsToAdd.length > 0) {
    const inserts = await Promise.all(
      testsToAdd.map(async (testId) => {
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
  const [subjectsResult, testsResult] = await Promise.all([
    supabase
      .from('subjects')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('tests')
      .select('subject_id'),
  ]);

  if (subjectsResult.error) {
    console.error('Error fetching subjects:', subjectsResult.error);
    return [];
  }

  // Count tests per subject from the flat list
  const countMap: Record<string, number> = {};
  if (testsResult.data) {
    for (const row of testsResult.data) {
      if (row.subject_id) {
        countMap[row.subject_id] = (countMap[row.subject_id] || 0) + 1;
      }
    }
  }

  return (subjectsResult.data || []).map((subject) => ({
    ...subject,
    test_count: countMap[subject.id] || 0,
  }));
}

// Fetch active subjects only (for students)
export async function fetchActiveSubjects(): Promise<DatabaseSubjectWithCount[]> {
  const [subjectsResult, testsResult] = await Promise.all([
    supabase
      .from('subjects')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('tests')
      .select('subject_id')
      .eq('is_active', true),
  ]);

  if (subjectsResult.error) {
    console.error('Error fetching active subjects:', subjectsResult.error);
    return [];
  }

  const countMap: Record<string, number> = {};
  if (testsResult.data) {
    for (const row of testsResult.data) {
      if (row.subject_id) {
        countMap[row.subject_id] = (countMap[row.subject_id] || 0) + 1;
      }
    }
  }

  return (subjectsResult.data || []).map((subject) => ({
    ...subject,
    test_count: countMap[subject.id] || 0,
  }));
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

  // Fetch the actual questions with passage data
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('*, passages (*)')
    .in('id', questionIds);

  if (qError) {
    console.error('Error fetching questions:', qError);
    return [];
  }

  return (questions || []).map(q => convertToQuizFormat(q));
}

// Lightweight question type for dashboard (only fields needed for skill/tag display)
export interface DashboardQuestion {
  id: string;
  skills: string[];
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard' | null;
}

// Batch fetch lightweight questions for ALL subjects at once (avoids N+1 per-subject queries)
// Only fetches id, skills, tags, difficulty — not full question data
export async function fetchQuestionsForAllSubjects(subjectIds: string[]): Promise<{ [subjectId: string]: DashboardQuestion[] }> {
  if (subjectIds.length === 0) return {};

  // 1. Get all active tests with their subject_id
  const { data: tests, error: testsError } = await supabase
    .from('tests')
    .select('id, subject_id')
    .eq('is_active', true)
    .in('subject_id', subjectIds);

  if (testsError || !tests || tests.length === 0) {
    return {};
  }

  const testIds = tests.map(t => t.id);
  const testSubjectMap: Record<string, string> = {};
  for (const t of tests) {
    testSubjectMap[t.id] = t.subject_id;
  }

  // 2. Get all question IDs for these tests
  const { data: testQuestions, error: tqError } = await supabase
    .from('test_questions')
    .select('question_id, test_id')
    .in('test_id', testIds);

  if (tqError || !testQuestions || testQuestions.length === 0) {
    return {};
  }

  // Map: question_id -> Set of subject_ids
  const questionSubjects: Record<string, Set<string>> = {};
  const allQuestionIds = new Set<string>();
  for (const tq of testQuestions) {
    allQuestionIds.add(tq.question_id);
    const subjectId = testSubjectMap[tq.test_id];
    if (subjectId) {
      if (!questionSubjects[tq.question_id]) questionSubjects[tq.question_id] = new Set();
      questionSubjects[tq.question_id].add(subjectId);
    }
  }

  // 3. Fetch only the columns we need (id, skills, tags, difficulty) — NOT full question data
  const questionIdsArray = [...allQuestionIds];
  const BATCH_SIZE = 200;
  const allQuestions: any[] = [];
  for (let i = 0; i < questionIdsArray.length; i += BATCH_SIZE) {
    const batch = questionIdsArray.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('questions')
      .select('id, skills, tags, difficulty')
      .in('id', batch);
    if (!error && data) allQuestions.push(...data);
  }

  // 4. Group by subject
  const result: { [subjectId: string]: DashboardQuestion[] } = {};
  for (const sid of subjectIds) result[sid] = [];

  for (const q of allQuestions) {
    const subjects = questionSubjects[q.id];
    if (subjects) {
      for (const sid of subjects) {
        result[sid].push({
          id: q.id,
          skills: q.skills || [],
          tags: q.tags || [],
          difficulty: q.difficulty || null,
        });
      }
    }
  }

  return result;
}

// Fetch ALL dashboard data in a single parallel batch (tests, subjects, tags, questions-by-subject)
export async function fetchAllDashboardData(): Promise<{
  tests: DatabaseTestWithCount[];
  subjects: DatabaseSubjectWithCount[];
  tags: string[];
  questionsBySubject: { [subjectId: string]: DashboardQuestion[] };
}> {
  // Single parallel batch: fetch all raw data at once
  const [testsResult, testQuestionsResult, subjectsResult, activeTestsResult, questionsResult] = await Promise.all([
    // For active tests with subject names
    supabase.from('tests').select('*, subjects (name)').eq('is_active', true).order('created_at', { ascending: true }),
    // For question counts per test AND question-subject mapping
    supabase.from('test_questions').select('test_id, question_id'),
    // For active subjects
    supabase.from('subjects').select('*').eq('is_active', true).order('display_order', { ascending: true }).order('name', { ascending: true }),
    // For subject test counts (active tests with subject_id)
    supabase.from('tests').select('subject_id').eq('is_active', true),
    // For all questions (lightweight: id, skills, tags, difficulty)
    supabase.from('questions').select('id, skills, tags, difficulty'),
  ]);

  // Build test question count map
  const testCountMap: Record<string, number> = {};
  const testQuestionRows = testQuestionsResult.data || [];
  for (const row of testQuestionRows) {
    testCountMap[row.test_id] = (testCountMap[row.test_id] || 0) + 1;
  }

  // Format tests with counts
  const tests: DatabaseTestWithCount[] = (testsResult.data || []).map((test: any) => ({
    ...test,
    subject_name: test.subjects?.name || undefined,
    subjects: undefined,
    question_count: testCountMap[test.id] || 0,
  }));

  // Build subject test count map
  const subjectCountMap: Record<string, number> = {};
  for (const row of (activeTestsResult.data || [])) {
    if (row.subject_id) {
      subjectCountMap[row.subject_id] = (subjectCountMap[row.subject_id] || 0) + 1;
    }
  }

  // Format subjects with counts
  const subjects: DatabaseSubjectWithCount[] = (subjectsResult.data || []).map((subject) => ({
    ...subject,
    test_count: subjectCountMap[subject.id] || 0,
  }));

  // Extract tags from questions
  const tagsSet = new Set<string>();
  const questionsData = questionsResult.data || [];
  for (const q of questionsData) {
    if (q.tags && Array.isArray(q.tags)) {
      for (const tag of q.tags) tagsSet.add(tag);
    }
  }
  const tags = Array.from(tagsSet).sort();

  // Build question-to-subject mapping using test_questions + tests
  // Map: test_id -> subject_id (only active tests)
  const testSubjectMap: Record<string, string> = {};
  for (const test of (testsResult.data || [])) {
    testSubjectMap[test.id] = test.subject_id;
  }

  // Map: question_id -> Set<subject_id>
  const questionSubjects: Record<string, Set<string>> = {};
  for (const tq of testQuestionRows) {
    const subjectId = testSubjectMap[tq.test_id];
    if (subjectId) {
      if (!questionSubjects[tq.question_id]) questionSubjects[tq.question_id] = new Set();
      questionSubjects[tq.question_id].add(subjectId);
    }
  }

  // Build questions-by-subject map
  const questionsBySubject: { [subjectId: string]: DashboardQuestion[] } = {};
  for (const subject of subjects) questionsBySubject[subject.id] = [];

  for (const q of questionsData) {
    const subs = questionSubjects[q.id];
    if (subs) {
      const dq: DashboardQuestion = {
        id: q.id,
        skills: q.skills || [],
        tags: q.tags || [],
        difficulty: q.difficulty || null,
      };
      for (const sid of subs) {
        if (questionsBySubject[sid]) questionsBySubject[sid].push(dq);
      }
    }
  }

  return { tests, subjects, tags, questionsBySubject };
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


// =====================================================
// Passage Management (for grouped questions)
// =====================================================

// Convert DatabasePassage to Passage format
export function convertToPassageFormat(dbPassage: DatabasePassage): Passage {
  return {
    id: dbPassage.id,
    aboveText: dbPassage.above_text || undefined,
    passageText: dbPassage.passage_text || undefined,
    passageDocuments: coerceDocs(dbPassage.passage_documents),
    imageSize: dbPassage.image_size || 'large',
    createdAt: dbPassage.created_at,
    updatedAt: dbPassage.updated_at,
  };
}

// Create a new passage
export async function createPassage(passage: {
  above_text?: string | null;
  passage_text?: string | null;
  passage_image_url?: string | null;
  iframe_url?: string | null;
  iframe_page?: number | null;
  passage_documents?: QuestionDocument[];
  image_size?: string | null;
}): Promise<DatabasePassage | null> {
  const { data, error } = await supabase
    .from('passages')
    .insert([passage])
    .select()
    .single();

  if (error) {
    console.error('Error creating passage:', error);
    return null;
  }

  return data;
}

// Update an existing passage
export async function updatePassage(
  id: string,
  updates: Partial<Omit<DatabasePassage, 'id' | 'created_at'>>
): Promise<DatabasePassage | null> {
  const { data, error } = await supabase
    .from('passages')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating passage:', error);
    return null;
  }

  return data;
}

// Delete a passage (will set passage_id to null on associated questions)
export async function deletePassage(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('passages')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting passage:', error);
    return false;
  }

  return true;
}

// Fetch a passage by ID
export async function fetchPassageById(id: string): Promise<DatabasePassage | null> {
  const { data, error } = await supabase
    .from('passages')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching passage:', error);
    return null;
  }

  return data;
}

// Fetch all questions for a passage
export async function fetchQuestionsForPassage(passageId: string): Promise<DatabaseQuestion[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('passage_id', passageId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching questions for passage:', error);
    return [];
  }

  return data || [];
}

// Create a passage with multiple questions (grouped question creation)
export async function createPassageWithQuestions(
  passageData: {
    above_text?: string | null;
    passage_text?: string | null;
    passage_image_url?: string | null;
    iframe_url?: string | null;
    iframe_page?: number | null;
    passage_documents?: QuestionDocument[];
    image_size?: string | null;
    type?: 'grouped' | 'parts';
  },
  questionsData: Omit<DatabaseQuestion, 'id' | 'created_at' | 'updated_at' | 'passage_id'>[]
): Promise<{ passage: DatabasePassage; questions: DatabaseQuestion[] } | null> {
  // Create the passage first
  const passage = await createPassage(passageData);
  if (!passage) {
    console.error('Failed to create passage');
    return null;
  }

  console.log('Created passage with ID:', passage.id);

  // Create questions one by one to ensure each gets the passage_id
  const createdQuestions: DatabaseQuestion[] = [];

  for (let i = 0; i < questionsData.length; i++) {
    const questionData = {
      ...questionsData[i],
      passage_id: passage.id,
    };

    console.log(`Creating question ${i + 1} with passage_id:`, passage.id);

    const { data: question, error } = await supabase
      .from('questions')
      .insert([questionData])
      .select()
      .single();

    if (error || !question) {
      console.error(`Error creating question ${i + 1} for passage:`, error);
      // Clean up: delete already created questions and the passage
      for (const q of createdQuestions) {
        await deleteQuestion(q.id);
      }
      await deletePassage(passage.id);
      return null;
    }

    console.log(`Created question ${i + 1} with ID:`, question.id, 'passage_id:', question.passage_id);
    createdQuestions.push(question);
  }

  return { passage, questions: createdQuestions };
}

// Link existing questions to a new passage (for grouping existing questions)
export async function linkQuestionsToNewPassage(
  questionIds: string[],
  passageData: {
    above_text?: string | null;
    passage_text?: string | null;
    passage_image_url?: string | null;
    iframe_url?: string | null;
    iframe_page?: number | null;
    passage_documents?: QuestionDocument[];
    image_size?: string | null;
    type?: 'grouped' | 'parts';
  }
): Promise<{ passage: DatabasePassage; updatedCount: number } | null> {
  // Create the passage first
  const passage = await createPassage(passageData);
  if (!passage) {
    console.error('Failed to create passage for linking');
    return null;
  }

  console.log('Created passage for linking with ID:', passage.id);

  // Update all questions to link to this passage
  const { data, error } = await supabase
    .from('questions')
    .update({ passage_id: passage.id })
    .in('id', questionIds)
    .select();

  if (error) {
    console.error('Error linking questions to passage:', error);
    // Clean up the passage since linking failed
    await deletePassage(passage.id);
    return null;
  }

  console.log(`Linked ${data?.length || 0} questions to passage ${passage.id}`);
  return { passage, updatedCount: data?.length || 0 };
}

// Unlink questions from a passage (remove grouping)
export async function unlinkQuestionsFromPassage(
  questionIds: string[]
): Promise<boolean> {
  const { error } = await supabase
    .from('questions')
    .update({ passage_id: null })
    .in('id', questionIds);

  if (error) {
    console.error('Error unlinking questions from passage:', error);
    return false;
  }

  return true;
}

// =====================================================
// Test Sections Management
// =====================================================

// Convert DatabaseTestSection to TestSection format
export function convertToSectionFormat(dbSection: DatabaseTestSection & { question_count?: number }): TestSection {
  return {
    id: dbSection.id,
    testId: dbSection.test_id,
    name: dbSection.name,
    description: dbSection.description || undefined,
    referenceDocuments: coerceDocs(dbSection.reference_documents),
    displayOrder: dbSection.display_order,
    questionCount: dbSection.question_count,
  };
}

// Fetch all sections for a test
export async function fetchSectionsForTest(testId: string): Promise<DatabaseTestSection[]> {
  const { data, error } = await supabase
    .from('test_sections')
    .select('*')
    .eq('test_id', testId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching sections for test:', error);
    return [];
  }

  return data || [];
}

// Fetch sections with question counts
export async function fetchSectionsWithCounts(testId: string): Promise<TestSection[]> {
  const sections = await fetchSectionsForTest(testId);

  const sectionsWithCounts = await Promise.all(
    sections.map(async (section) => {
      const { count } = await supabase
        .from('test_questions')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', testId)
        .eq('section_id', section.id);

      return convertToSectionFormat({
        ...section,
        question_count: count || 0,
      });
    })
  );

  return sectionsWithCounts;
}

// Create a new test section
export async function createTestSection(section: {
  test_id: string;
  name: string;
  description?: string;
  reference_image_url?: string;
  reference_documents?: QuestionDocument[];
  display_order?: number;
}): Promise<DatabaseTestSection | null> {
  // If no display order provided, get the max and add 1
  let order = section.display_order;
  if (order === undefined) {
    const { data } = await supabase
      .from('test_sections')
      .select('display_order')
      .eq('test_id', section.test_id)
      .order('display_order', { ascending: false })
      .limit(1);

    order = (data?.[0]?.display_order || 0) + 1;
  }

  const { data, error } = await supabase
    .from('test_sections')
    .insert([{
      test_id: section.test_id,
      name: section.name,
      description: section.description || null,
      reference_image_url: section.reference_image_url || null,
      reference_documents: section.reference_documents ?? [],
      display_order: order,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating test section:', error);
    return null;
  }

  return data;
}

// Update a test section
export async function updateTestSection(
  id: string,
  updates: Partial<{
    name: string;
    description: string | null;
    reference_image_url: string | null;
    reference_documents: QuestionDocument[];
    display_order: number;
  }>
): Promise<DatabaseTestSection | null> {
  const { data, error } = await supabase
    .from('test_sections')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating test section:', error);
    return null;
  }

  return data;
}

// Delete a test section
export async function deleteTestSection(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('test_sections')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting test section:', error);
    return false;
  }

  return true;
}

// Assign a question to a section within a test
export async function assignQuestionToSection(
  testId: string,
  questionId: string,
  sectionId: string | null
): Promise<boolean> {
  const { error } = await supabase
    .from('test_questions')
    .update({ section_id: sectionId })
    .eq('test_id', testId)
    .eq('question_id', questionId);

  if (error) {
    console.error('Error assigning question to section:', error);
    return false;
  }

  return true;
}

// Bulk assign questions to a section by their IDs
export async function bulkAssignQuestionsToSection(
  testId: string,
  questionIds: string[],
  sectionId: string | null
): Promise<boolean> {
  if (questionIds.length === 0) return true;

  const { error } = await supabase
    .from('test_questions')
    .update({ section_id: sectionId })
    .eq('test_id', testId)
    .in('question_id', questionIds);

  if (error) {
    console.error('Error bulk assigning questions to section:', error);
    return false;
  }

  return true;
}

// Update section display orders
export async function updateSectionOrders(orders: { id: string; display_order: number }[]): Promise<boolean> {
  const updates = orders.map(({ id, display_order }) =>
    supabase
      .from('test_sections')
      .update({ display_order, updated_at: new Date().toISOString() })
      .eq('id', id)
  );

  const results = await Promise.all(updates);
  const hasError = results.some(result => result.error);

  if (hasError) {
    console.error('Error updating section orders');
    return false;
  }

  return true;
}
