import { supabase } from './supabase';

export interface BugReport {
  id: string;
  questionId: string | null;
  testId: string | null;
  questionNumber: number | null;
  description: string;
  screenshotUrl: string | null;
  status: 'open' | 'reviewed' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseBugReport {
  id: string;
  question_id: string | null;
  test_id: string | null;
  question_number: number | null;
  description: string;
  screenshot_url: string | null;
  status: 'open' | 'reviewed' | 'resolved';
  created_at: string;
  updated_at: string;
}

// Convert database format to app format
export function convertToBugReportFormat(dbReport: DatabaseBugReport): BugReport {
  return {
    id: dbReport.id,
    questionId: dbReport.question_id,
    testId: dbReport.test_id,
    questionNumber: dbReport.question_number,
    description: dbReport.description,
    screenshotUrl: dbReport.screenshot_url,
    status: dbReport.status,
    createdAt: dbReport.created_at,
    updatedAt: dbReport.updated_at,
  };
}

// Upload screenshot to Supabase storage
export async function uploadBugScreenshot(
  dataUrl: string,
  filename: string
): Promise<string | null> {
  try {
    // Convert base64 data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from('bug-screenshots')
      .upload(`screenshots/${filename}`, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/png',
      });

    if (error) {
      console.error('Error uploading screenshot:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('bug-screenshots')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error processing screenshot:', error);
    return null;
  }
}

// Create a new bug report
export async function createBugReport(report: {
  questionId?: string | null;
  testId?: string | null;
  questionNumber?: number | null;
  description: string;
  screenshotUrl?: string | null;
}): Promise<DatabaseBugReport | null> {
  const { data, error } = await supabase
    .from('bug_reports')
    .insert([{
      question_id: report.questionId || null,
      test_id: report.testId || null,
      question_number: report.questionNumber || null,
      description: report.description,
      screenshot_url: report.screenshotUrl || null,
      status: 'open',
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating bug report:', error);
    return null;
  }

  return data;
}

// Fetch all bug reports (for admin)
export async function fetchBugReports(statusFilter?: 'open' | 'reviewed' | 'resolved'): Promise<DatabaseBugReport[]> {
  let query = supabase
    .from('bug_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching bug reports:', error);
    return [];
  }

  return data || [];
}

// Update bug report status
export async function updateBugReportStatus(
  id: string,
  status: 'open' | 'reviewed' | 'resolved'
): Promise<boolean> {
  const { error } = await supabase
    .from('bug_reports')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error updating bug report status:', error);
    return false;
  }

  return true;
}

// Delete a bug report
export async function deleteBugReport(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('bug_reports')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting bug report:', error);
    return false;
  }

  return true;
}

// Get bug report counts by status
export async function getBugReportCounts(): Promise<{ open: number; reviewed: number; resolved: number }> {
  const { data, error } = await supabase
    .from('bug_reports')
    .select('status');

  if (error) {
    console.error('Error fetching bug report counts:', error);
    return { open: 0, reviewed: 0, resolved: 0 };
  }

  const counts = { open: 0, reviewed: 0, resolved: 0 };
  (data || []).forEach((report: { status: string }) => {
    if (report.status === 'open') counts.open++;
    else if (report.status === 'reviewed') counts.reviewed++;
    else if (report.status === 'resolved') counts.resolved++;
  });

  return counts;
}
