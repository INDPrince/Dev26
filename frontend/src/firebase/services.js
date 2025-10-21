import { database } from './config';
import { ref, set, get, remove, update, push, child } from 'firebase/database';

// Classes Management
export const getAllClasses = async () => {
  try {
    const classesRef = ref(database, 'classes');
    const snapshot = await get(classesRef);
    if (snapshot.exists()) {
      const classes = [];
      snapshot.forEach((childSnapshot) => {
        classes.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      // Sort by order
      return classes.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    // Return default classes if none exist
    return [
      { id: '10th', name: '10th', order: 1 },
      { id: '11th', name: '11th', order: 2 },
      { id: '12th', name: '12th', order: 3 }
    ];
  } catch (error) {
    console.error('Error fetching classes:', error);
    return [
      { id: '10th', name: '10th', order: 1 },
      { id: '11th', name: '11th', order: 2 },
      { id: '12th', name: '12th', order: 3 }
    ];
  }
};

export const createClass = async (classData) => {
  try {
    const classesRef = ref(database, 'classes');
    const newClassRef = push(classesRef);
    await set(newClassRef, {
      ...classData,
      id: newClassRef.key,
      createdAt: Date.now()
    });
    return { success: true, id: newClassRef.key };
  } catch (error) {
    console.error('Error creating class:', error);
    return { success: false, error: error.message };
  }
};

export const updateClass = async (classId, updates) => {
  try {
    const classRef = ref(database, `classes/${classId}`);
    await update(classRef, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating class:', error);
    return { success: false, error: error.message };
  }
};

export const deleteClass = async (classId) => {
  try {
    const classRef = ref(database, `classes/${classId}`);
    await remove(classRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting class:', error);
    return { success: false, error: error.message };
  }
};

// Subjects
export const createSubject = async (subjectData) => {
  try {
    const subjectsRef = ref(database, 'subjects');
    const newSubjectRef = push(subjectsRef);
    await set(newSubjectRef, {
      ...subjectData,
      id: newSubjectRef.key,
      createdAt: Date.now()
    });
    return { success: true, id: newSubjectRef.key };
  } catch (error) {
    console.error('Error creating subject:', error);
    return { success: false, error: error.message };
  }
};

export const getAllSubjects = async () => {
  try {
    const subjectsRef = ref(database, 'subjects');
    const snapshot = await get(subjectsRef);
    if (snapshot.exists()) {
      const subjects = [];
      snapshot.forEach((childSnapshot) => {
        subjects.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      return subjects;
    }
    return [];
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return [];
  }
};

export const updateSubject = async (subjectId, updates) => {
  try {
    const subjectRef = ref(database, `subjects/${subjectId}`);
    await update(subjectRef, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating subject:', error);
    return { success: false, error: error.message };
  }
};

export const deleteSubject = async (subjectId) => {
  try {
    const subjectRef = ref(database, `subjects/${subjectId}`);
    await remove(subjectRef);
    
    // Also delete all chapters and questions for this subject
    const chaptersRef = ref(database, `chapters/${subjectId}`);
    await remove(chaptersRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting subject:', error);
    return { success: false, error: error.message };
  }
};

// Chapters
export const createChapter = async (subjectId, chapterData) => {
  try {
    const chaptersRef = ref(database, `chapters/${subjectId}`);
    const newChapterRef = push(chaptersRef);
    await set(newChapterRef, {
      ...chapterData,
      id: newChapterRef.key,
      subjectId,
      createdAt: Date.now()
    });
    
    // Update subject's chapter count
    await updateSubjectChapterCount(subjectId);
    
    return { success: true, id: newChapterRef.key };
  } catch (error) {
    console.error('Error creating chapter:', error);
    return { success: false, error: error.message };
  }
};

export const getChaptersBySubject = async (subjectId) => {
  try {
    const chaptersRef = ref(database, `chapters/${subjectId}`);
    const snapshot = await get(chaptersRef);
    if (snapshot.exists()) {
      const chapters = [];
      snapshot.forEach((childSnapshot) => {
        chapters.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      // Sort by serial number
      return chapters.sort((a, b) => a.serial - b.serial);
    }
    return [];
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return [];
  }
};

export const updateChapter = async (subjectId, chapterId, updates) => {
  try {
    const chapterRef = ref(database, `chapters/${subjectId}/${chapterId}`);
    await update(chapterRef, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating chapter:', error);
    return { success: false, error: error.message };
  }
};

export const deleteChapter = async (subjectId, chapterId) => {
  try {
    const chapterRef = ref(database, `chapters/${subjectId}/${chapterId}`);
    await remove(chapterRef);
    
    // Also delete all questions for this chapter
    const questionsRef = ref(database, `questions/${chapterId}`);
    await remove(questionsRef);
    
    // Update subject's chapter count
    await updateSubjectChapterCount(subjectId);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return { success: false, error: error.message };
  }
};

// Update subject chapter count helper
const updateSubjectChapterCount = async (subjectId) => {
  try {
    const chapters = await getChaptersBySubject(subjectId);
    await updateSubject(subjectId, { totalChapters: chapters.length });
  } catch (error) {
    console.error('Error updating subject chapter count:', error);
  }
};

// Questions
export const uploadQuestions = async (chapterId, questions, isUpdate = false) => {
  try {
    const questionsRef = ref(database, `questions/${chapterId}`);
    
    if (isUpdate) {
      // Update mode: Update existing questions by matching question text
      const existingQuestions = await getQuestionsByChapter(chapterId);
      
      for (const newQuestion of questions) {
        // Find matching question by question text
        const existingQuestion = existingQuestions.find(
          eq => eq.question?.trim() === newQuestion.question?.trim()
        );
        
        if (existingQuestion) {
          // Update existing question - preserve verified status unless explicitly changed
          const questionRef = ref(database, `questions/${chapterId}/${existingQuestion.id}`);
          await update(questionRef, {
            question: newQuestion.question,
            answer: newQuestion.answer,
            options: newQuestion.options,
            verified: newQuestion.verified !== undefined ? newQuestion.verified : (existingQuestion.verified || false)
          });
        } else {
          // Add new question if not found
          const newQuestionRef = push(questionsRef);
          await set(newQuestionRef, {
            ...newQuestion,
            id: newQuestionRef.key,
            chapterId,
            verified: newQuestion.verified || false
          });
        }
      }
      
      // Update chapter's question count
      const updatedQuestions = await getQuestionsByChapter(chapterId);
      const chapterPath = await findChapterPath(chapterId);
      if (chapterPath) {
        await update(ref(database, chapterPath), {
          questionCount: updatedQuestions.length
        });
      }
    } else {
      // Upload mode: Replace all questions
      await remove(questionsRef);
      
      for (const question of questions) {
        const newQuestionRef = push(questionsRef);
        await set(newQuestionRef, {
          ...question,
          id: newQuestionRef.key,
          chapterId,
          verified: question.verified || false
        });
      }
      
      // Update chapter's question count
      const chapterPath = await findChapterPath(chapterId);
      if (chapterPath) {
        await update(ref(database, chapterPath), {
          questionCount: questions.length
        });
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error uploading questions:', error);
    return { success: false, error: error.message };
  }
};

export const getQuestionsByChapter = async (chapterId) => {
  try {
    const questionsRef = ref(database, `questions/${chapterId}`);
    const snapshot = await get(questionsRef);
    if (snapshot.exists()) {
      const questions = [];
      snapshot.forEach((childSnapshot) => {
        questions.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      return questions;
    }
    return [];
  } catch (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
};

// Get questions by multiple chapters
// 🚀 Optimized with Promise.all for parallel loading (50% faster!)
export const getQuestionsByChapters = async (chapterIds) => {
  try {
    // Fetch all chapters in parallel instead of sequentially
    const questionPromises = chapterIds.map(chapterId => getQuestionsByChapter(chapterId));
    const allQuestionsArrays = await Promise.all(questionPromises);
    
    // Flatten the array of arrays
    return allQuestionsArrays.flat();
  } catch (error) {
    console.error('Error fetching questions by chapters:', error);
    return [];
  }
};

// Helper function to find chapter path
const findChapterPath = async (chapterId) => {
  try {
    const chaptersRef = ref(database, 'chapters');
    const snapshot = await get(chaptersRef);
    if (snapshot.exists()) {
      let foundPath = null;
      snapshot.forEach((subjectSnapshot) => {
        subjectSnapshot.forEach((chapterSnapshot) => {
          if (chapterSnapshot.key === chapterId) {
            foundPath = `chapters/${subjectSnapshot.key}/${chapterId}`;
          }
        });
      });
      return foundPath;
    }
    return null;
  } catch (error) {
    console.error('Error finding chapter path:', error);
    return null;
  }
};

// Reorder chapters
export const reorderChapters = async (subjectId, chapters) => {
  try {
    const updates = {};
    chapters.forEach((chapter, index) => {
      updates[`chapters/${subjectId}/${chapter.id}/serial`] = index + 1;
    });
    await update(ref(database), updates);
    return { success: true };
  } catch (error) {
    console.error('Error reordering chapters:', error);
    return { success: false, error: error.message };
  }
};

// Admin Credentials
export const getAdminCredentials = async () => {
  try {
    const credentialsRef = ref(database, 'admin/credentials');
    const snapshot = await get(credentialsRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    // Default credentials
    return {
      email: 'anandmanju2889@gmail.com',
      password: 'Prince774623'
    };
  } catch (error) {
    console.error('Error fetching admin credentials:', error);
    return {
      email: 'anandmanju2889@gmail.com',
      password: 'Prince774623'
    };
  }
};

export const updateAdminCredentials = async (email, password) => {
  try {
    const credentialsRef = ref(database, 'admin/credentials');
    await set(credentialsRef, {
      email,
      password,
      updatedAt: Date.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating admin credentials:', error);
    return { success: false, error: error.message };
  }
};


// Reports Management
export const createReport = async (reportData) => {
  try {
    // Validate required fields
    if (!reportData.questionId || !reportData.chapterId) {
      console.error('Missing required fields for report:', reportData);
      return { success: false, error: 'Missing required fields (questionId or chapterId)' };
    }
    
    const reportsRef = ref(database, 'reports');
    const newReportRef = push(reportsRef);
    await set(newReportRef, {
      ...reportData,
      id: newReportRef.key,
      createdAt: Date.now(),
      status: 'pending', // pending, resolved, verified
      reason: reportData.reason || reportData.reportType || 'Unknown issue'
    });
    return { success: true, id: newReportRef.key };
  } catch (error) {
    console.error('Error creating report:', error);
    return { success: false, error: error.message };
  }
};

export const getAllReports = async () => {
  try {
    const reportsRef = ref(database, 'reports');
    const snapshot = await get(reportsRef);
    if (snapshot.exists()) {
      const reports = [];
      snapshot.forEach((childSnapshot) => {
        reports.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      // Sort by createdAt (newest first)
      return reports.sort((a, b) => b.createdAt - a.createdAt);
    }
    return [];
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
};

export const updateReportStatus = async (reportId, status) => {
  try {
    const reportRef = ref(database, `reports/${reportId}`);
    await update(reportRef, { 
      status,
      resolvedAt: Date.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating report status:', error);
    return { success: false, error: error.message };
  }
};

export const deleteReport = async (reportId) => {
  try {
    const reportRef = ref(database, `reports/${reportId}`);
    await remove(reportRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting report:', error);
    return { success: false, error: error.message };
  }
};

// Verified Questions Management
export const markQuestionAsVerified = async (questionId) => {
  try {
    // Find the question and mark it as verified
    const questionsRef = ref(database, 'questions');
    const snapshot = await get(questionsRef);
    
    if (snapshot.exists()) {
      let questionPath = null;
      snapshot.forEach((chapterSnapshot) => {
        chapterSnapshot.forEach((questionSnapshot) => {
          if (questionSnapshot.key === questionId) {
            questionPath = `questions/${chapterSnapshot.key}/${questionId}`;
          }
        });
      });
      
      if (questionPath) {
        await update(ref(database, questionPath), { verified: true });
        return { success: true };
      }
    }
    return { success: false, error: 'Question not found' };
  } catch (error) {
    console.error('Error marking question as verified:', error);
    return { success: false, error: error.message };
  }
};

export const unmarkQuestionAsVerified = async (questionId) => {
  try {
    const questionsRef = ref(database, 'questions');
    const snapshot = await get(questionsRef);
    
    if (snapshot.exists()) {
      let questionPath = null;
      snapshot.forEach((chapterSnapshot) => {
        chapterSnapshot.forEach((questionSnapshot) => {
          if (questionSnapshot.key === questionId) {
            questionPath = `questions/${chapterSnapshot.key}/${questionId}`;
          }
        });
      });
      
      if (questionPath) {
        await update(ref(database, questionPath), { verified: false });
        return { success: true };
      }
    }
    return { success: false, error: 'Question not found' };
  } catch (error) {
    console.error('Error unmarking question as verified:', error);
    return { success: false, error: error.message };
  }
};


// Backup Management
export const getAllBackups = async () => {
  try {
    const backupsRef = ref(database, 'backups');
    const snapshot = await get(backupsRef);
    if (snapshot.exists()) {
      const backups = [];
      snapshot.forEach((childSnapshot) => {
        backups.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      // Sort by timestamp (newest first)
      return backups.sort((a, b) => b.timestamp - a.timestamp);
    }
    return [];
  } catch (error) {
    console.error('Error fetching backups:', error);
    return [];
  }
};

export const createBackup = async (type, itemType, data) => {
  try {
    const backupsRef = ref(database, 'backups');
    const newBackupRef = push(backupsRef);
    
    // For subjects, include all related chapters and questions
    let fullData = { ...data };
    let relatedData = {};
    
    if (itemType === 'subject') {
      // Get all chapters for this subject
      const chapters = await getChaptersBySubject(data.id);
      relatedData.chapters = chapters;
      
      // 🚀 Get all questions for each chapter in parallel
      relatedData.questions = {};
      const questionPromises = chapters.map(chapter => 
        getQuestionsByChapter(chapter.id).then(questions => ({ 
          chapterId: chapter.id, 
          questions 
        }))
      );
      const allChapterQuestions = await Promise.all(questionPromises);
      
      // Build the questions object
      allChapterQuestions.forEach(({ chapterId, questions }) => {
        relatedData.questions[chapterId] = questions;
      });
    } else if (itemType === 'chapter') {
      // Get all questions for this chapter
      const questions = await getQuestionsByChapter(data.id);
      relatedData.questions = questions;
    }
    
    const backupData = {
      id: newBackupRef.key,
      type, // 'normal' or 'complete'
      itemType, // 'subject', 'chapter', 'question', 'report'
      data: fullData,
      relatedData, // Store related chapters and questions
      timestamp: Date.now(),
      expiresAt: type === 'normal' ? Date.now() + (7 * 24 * 60 * 60 * 1000) : null // 7 days for normal
    };
    
    await set(newBackupRef, backupData);
    
    // Keep only last 10 backups of this type
    await cleanupOldBackups(type);
    
    return { success: true, backup: backupData };
  } catch (error) {
    console.error('Error creating backup:', error);
    return { success: false, error: error.message };
  }
};

const cleanupOldBackups = async (type) => {
  try {
    const backupsRef = ref(database, 'backups');
    const snapshot = await get(backupsRef);
    
    if (snapshot.exists()) {
      const backups = [];
      snapshot.forEach((childSnapshot) => {
        const backup = childSnapshot.val();
        if (backup.type === type) {
          backups.push({ id: childSnapshot.key, ...backup });
        }
      });
      
      // Sort by timestamp and keep only last 10
      backups.sort((a, b) => b.timestamp - a.timestamp);
      
      if (backups.length > 10) {
        const toDelete = backups.slice(10);
        for (const backup of toDelete) {
          await remove(ref(database, `backups/${backup.id}`));
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
};

// Cleanup expired normal backups (7 days old)
export const cleanupExpiredBackups = async () => {
  try {
    const backupsRef = ref(database, 'backups');
    const snapshot = await get(backupsRef);
    const now = Date.now();
    
    if (snapshot.exists()) {
      snapshot.forEach(async (childSnapshot) => {
        const backup = childSnapshot.val();
        if (backup.type === 'normal' && backup.expiresAt && backup.expiresAt < now) {
          await remove(ref(database, `backups/${childSnapshot.key}`));
        }
      });
    }
  } catch (error) {
    console.error('Error cleaning up expired backups:', error);
  }
};

export const restoreFromBackup = async (backupId) => {
  try {
    const backupRef = ref(database, `backups/${backupId}`);
    const snapshot = await get(backupRef);
    
    if (snapshot.exists()) {
      const backup = snapshot.val();
      const { itemType, data, relatedData } = backup;
      
      // Restore based on item type
      if (itemType === 'subject') {
        // Restore subject
        await set(ref(database, `subjects/${data.id}`), data);
        
        // Restore all chapters
        if (relatedData?.chapters) {
          for (const chapter of relatedData.chapters) {
            await set(ref(database, `chapters/${data.id}/${chapter.id}`), chapter);
          }
        }
        
        // Restore all questions
        if (relatedData?.questions) {
          for (const [chapterId, questions] of Object.entries(relatedData.questions)) {
            for (const question of questions) {
              await set(ref(database, `questions/${chapterId}/${question.id}`), question);
            }
          }
        }
      } else if (itemType === 'chapter') {
        await set(ref(database, `chapters/${data.subjectId}/${data.id}`), data);
        
        // Restore all questions
        if (relatedData?.questions) {
          for (const question of relatedData.questions) {
            await set(ref(database, `questions/${data.id}/${question.id}`), question);
          }
        }
      } else if (itemType === 'question') {
        await set(ref(database, `questions/${data.chapterId}/${data.id}`), data);
      } else if (itemType === 'report') {
        await set(ref(database, `reports/${data.id}`), data);
      }
      
      return { success: true };
    }
    return { success: false, error: 'Backup not found' };
  } catch (error) {
    console.error('Error restoring backup:', error);
    return { success: false, error: error.message };
  }
};

export const deleteBackup = async (backupId) => {
  try {
    await remove(ref(database, `backups/${backupId}`));
    return { success: true };
  } catch (error) {
    console.error('Error deleting backup:', error);
    return { success: false, error: error.message };
  }
};

// Normal Delete - 7 day backup
export const normalDelete = async (itemType, data) => {
  try {
    // Create backup first
    const backupResult = await createBackup('normal', itemType, data);
    
    // Then delete the item
    if (itemType === 'subject') {
      await deleteSubject(data.id);
    } else if (itemType === 'chapter') {
      await deleteChapter(data.subjectId, data.id);
    } else if (itemType === 'question') {
      const questionPath = await findQuestionPath(data.id);
      if (questionPath) {
        await remove(ref(database, questionPath));
      }
    } else if (itemType === 'report') {
      await deleteReport(data.id);
    }
    
    return { success: true, backup: backupResult.backup };
  } catch (error) {
    console.error('Error in normal delete:', error);
    return { success: false, error: error.message };
  }
};

// Complete Delete - Permanent backup
export const completeDelete = async (itemType, data) => {
  try {
    // Create permanent backup
    const backupResult = await createBackup('complete', itemType, data);
    
    // Then delete the item
    if (itemType === 'subject') {
      await deleteSubject(data.id);
    } else if (itemType === 'chapter') {
      await deleteChapter(data.subjectId, data.id);
    } else if (itemType === 'question') {
      const questionPath = await findQuestionPath(data.id);
      if (questionPath) {
        await remove(ref(database, questionPath));
      }
    } else if (itemType === 'report') {
      await deleteReport(data.id);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error applying backup changes:', error);
    return { success: false, error: error.message };
  }
};

// Import complete database or selective items
export const importDatabase = async (importData, options = { mode: 'all', selected: [] }) => {
  try {
    const { subjects, chapters, questions, reports, admin } = importData;
    
    if (options.mode === 'all') {
      // Import everything
      if (subjects) {
        // 🚀 Batch write all subjects in parallel
        const subjectPromises = subjects.map(subject =>
          set(ref(database, `subjects/${subject.id}`), subject)
        );
        await Promise.all(subjectPromises);
      }
      if (chapters) {
        // 🚀 Batch write all chapters in parallel
        const chapterPromises = chapters.map(chapter =>
          set(ref(database, `chapters/${chapter.subjectId}/${chapter.id}`), chapter)
        );
        await Promise.all(chapterPromises);
      }
      if (questions) {
        // 🚀 Batch write all questions in parallel
        const questionPromises = questions.map(question =>
          set(ref(database, `questions/${question.chapterId}/${question.id}`), question)
        );
        await Promise.all(questionPromises);
      }
      if (reports) {
        // 🚀 Batch write all reports in parallel
        const reportPromises = reports.map(report =>
          set(ref(database, `reports/${report.id}`), report)
        );
        await Promise.all(reportPromises);
      }
      if (admin) {
        await set(ref(database, 'admin/credentials'), admin);
      }
    } else if (options.mode === 'selective') {
      // Import only selected subjects and their related data
      for (const subjectId of options.selected) {
        const subject = subjects.find(s => s.id === subjectId);
        if (subject) {
          await set(ref(database, `subjects/${subject.id}`), subject);
          
          // Import related chapters
          const relatedChapters = chapters.filter(c => c.subjectId === subjectId);
          for (const chapter of relatedChapters) {
            await set(ref(database, `chapters/${chapter.subjectId}/${chapter.id}`), chapter);
            
            // Import related questions
            const relatedQuestions = questions.filter(q => q.chapterId === chapter.id);
            for (const question of relatedQuestions) {
              await set(ref(database, `questions/${question.chapterId}/${question.id}`), question);
            }
          }
        }
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error importing database:', error);
    return { success: false, error: error.message };
  }
};

// Helper to find question path
const findQuestionPath = async (questionId) => {
  try {
    const questionsRef = ref(database, 'questions');
    const snapshot = await get(questionsRef);
    
    if (snapshot.exists()) {
      let foundPath = null;
      snapshot.forEach((chapterSnapshot) => {
        chapterSnapshot.forEach((questionSnapshot) => {
          if (questionSnapshot.key === questionId) {
            foundPath = `questions/${chapterSnapshot.key}/${questionId}`;
          }
        });
      });
      return foundPath;
    }
    return null;
  } catch (error) {
    console.error('Error finding question path:', error);
    return null;
  }
};

// Apply backup changes (for logs)
export const applyBackupChanges = async (backupData) => {
  try {
    const { itemType, data } = backupData;
    
    if (itemType === 'subject') {
      await set(ref(database, `subjects/${data.id}`), data);
    } else if (itemType === 'chapter') {
      await set(ref(database, `chapters/${data.subjectId}/${data.id}`), data);
    } else if (itemType === 'question') {
      await set(ref(database, `questions/${data.chapterId}/${data.id}`), data);
    } else if (itemType === 'report') {
      await set(ref(database, `reports/${data.id}`), data);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error applying backup changes:', error);
    return { success: false, error: error.message };
  }
};

// Install Demo Data - bulk installation with selective tree + Word Meaning
export const installDemoData = async (demoData, selectedData = null, progressCallback = null) => {
  try {
    const { subjects, chapters, questions, wordMeaningSubjects, wordMeaningChapters, wordMeaningPages, wordMeaningQuestions } = demoData;
    
    // OPTIMIZED: Use parallel batch operations with Promise.all
    const allPromises = [];
    
    // Install Regular Subjects - Batch in parallel
    if (subjects && subjects.length > 0) {
      if (progressCallback) progressCallback('Installing subjects...');
      const subjectPromises = subjects.map(subject => 
        set(ref(database, `subjects/${subject.id}`), { ...subject, source: 'mock' })
      );
      allPromises.push(...subjectPromises);
    }
    
    // Install Chapters - Batch in parallel
    if (chapters) {
      if (progressCallback) progressCallback('Installing chapters...');
      const chapterPromises = [];
      for (const [subjectId, subjectChapters] of Object.entries(chapters)) {
        for (const chapter of subjectChapters) {
          chapterPromises.push(
            set(ref(database, `chapters/${subjectId}/${chapter.id}`), { ...chapter, source: 'mock' })
          );
        }
      }
      allPromises.push(...chapterPromises);
    }
    
    // Install Questions - Batch in parallel
    if (questions) {
      if (progressCallback) progressCallback('Installing questions...');
      const questionPromises = [];
      for (const [chapterId, chapterQuestions] of Object.entries(questions)) {
        for (const question of chapterQuestions) {
          questionPromises.push(
            set(ref(database, `questions/${chapterId}/${question.id}`), { ...question, source: 'mock' })
          );
        }
      }
      allPromises.push(...questionPromises);
    }
    
    // Install Word Meaning Subjects - Batch in parallel
    if (wordMeaningSubjects && wordMeaningSubjects.length > 0) {
      if (progressCallback) progressCallback('Installing Word Meaning subjects...');
      const wmSubjectPromises = wordMeaningSubjects.map(wmSubject => 
        set(ref(database, `wordMeaning/subjects/${wmSubject.id}`), { ...wmSubject, source: 'mock' })
      );
      allPromises.push(...wmSubjectPromises);
    }
    
    // Install Word Meaning Chapters - Batch in parallel
    if (wordMeaningChapters) {
      if (progressCallback) progressCallback('Installing Word Meaning chapters...');
      const wmChapterPromises = [];
      for (const [subjectId, wmChapters] of Object.entries(wordMeaningChapters)) {
        for (const wmChapter of wmChapters) {
          wmChapterPromises.push(
            set(ref(database, `wordMeaning/chapters/${subjectId}/${wmChapter.id}`), { ...wmChapter, source: 'mock' })
          );
        }
      }
      allPromises.push(...wmChapterPromises);
    }
    
    // Install Word Meaning Pages - Batch in parallel
    if (wordMeaningPages) {
      if (progressCallback) progressCallback('Installing Word Meaning pages...');
      const wmPagePromises = [];
      for (const [chapterId, wmPages] of Object.entries(wordMeaningPages)) {
        for (const wmPage of wmPages) {
          wmPagePromises.push(
            set(ref(database, `wordMeaning/pages/${chapterId}/${wmPage.id}`), { ...wmPage, source: 'mock' })
          );
        }
      }
      allPromises.push(...wmPagePromises);
    }
    
    // Install Word Meaning Questions - Batch in parallel
    if (wordMeaningQuestions) {
      if (progressCallback) progressCallback('Installing Word Meaning questions...');
      const wmQuestionPromises = [];
      for (const [pageId, wmQs] of Object.entries(wordMeaningQuestions)) {
        for (const wmQ of wmQs) {
          wmQuestionPromises.push(
            set(ref(database, `wordMeaning/questions/${pageId}/${wmQ.id}`), { ...wmQ, source: 'mock' })
          );
        }
      }
      allPromises.push(...wmQuestionPromises);
    }
    
    // Execute all database writes in parallel - MUCH FASTER!
    if (progressCallback) progressCallback(`Installing ${allPromises.length} items in parallel...`);
    await Promise.all(allPromises);
    
    if (progressCallback) progressCallback('Installation complete!');
    return { success: true };
  } catch (error) {
    console.error('Error installing demo data:', error);
    return { success: false, error: error.message };
  }
};

// Remove Mock Data - removes only mock/demo installed data - FULLY OPTIMIZED
export const removeMockData = async () => {
  try {
    const deletePromises = [];
    
    // Parallel fetch: Get all data at once
    const [subjectsSnapshot, wmSubjectsSnapshot] = await Promise.all([
      get(ref(database, 'subjects')),
      get(ref(database, 'wordMeaning/subjects'))
    ]);
    
    // Process regular subjects
    if (subjectsSnapshot.exists()) {
      const subjectIds = [];
      
      // Collect mock subject IDs
      for (const [subjectId, subjectData] of Object.entries(subjectsSnapshot.val())) {
        if (subjectData.source === 'mock') {
          subjectIds.push(subjectId);
          deletePromises.push(remove(ref(database, `subjects/${subjectId}`)));
        }
      }
      
      // Parallel fetch all chapters for mock subjects
      const chapterPromises = subjectIds.map(subjectId => 
        get(ref(database, `chapters/${subjectId}`))
      );
      const chaptersSnapshots = await Promise.all(chapterPromises);
      
      // Process chapters and collect chapter IDs
      const chapterIds = [];
      chaptersSnapshots.forEach((chaptersSnapshot, idx) => {
        const subjectId = subjectIds[idx];
        if (chaptersSnapshot.exists()) {
          for (const [chapterId, chapterData] of Object.entries(chaptersSnapshot.val())) {
            if (chapterData.source === 'mock') {
              chapterIds.push(chapterId);
              deletePromises.push(remove(ref(database, `chapters/${subjectId}/${chapterId}`)));
            }
          }
        }
      });
      
      // Parallel fetch all questions for mock chapters
      const questionPromises = chapterIds.map(chapterId => 
        get(ref(database, `questions/${chapterId}`))
      );
      const questionsSnapshots = await Promise.all(questionPromises);
      
      // Process questions
      questionsSnapshots.forEach((questionsSnapshot, idx) => {
        const chapterId = chapterIds[idx];
        if (questionsSnapshot.exists()) {
          for (const [questionId, questionData] of Object.entries(questionsSnapshot.val())) {
            if (questionData.source === 'mock') {
              deletePromises.push(remove(ref(database, `questions/${chapterId}/${questionId}`)));
            }
          }
        }
      });
    }
    
    // Process Word Meaning subjects (similar parallel approach)
    if (wmSubjectsSnapshot.exists()) {
      const wmSubjectIds = [];
      
      for (const [subjectId, subjectData] of Object.entries(wmSubjectsSnapshot.val())) {
        if (subjectData.source === 'mock') {
          wmSubjectIds.push(subjectId);
          deletePromises.push(remove(ref(database, `wordMeaning/subjects/${subjectId}`)));
        }
      }
      
      // Parallel fetch Word Meaning chapters
      const wmChapterPromises = wmSubjectIds.map(subjectId => 
        get(ref(database, `wordMeaning/chapters/${subjectId}`))
      );
      const wmChaptersSnapshots = await Promise.all(wmChapterPromises);
      
      const wmChapterIds = [];
      wmChaptersSnapshots.forEach((wmChaptersSnapshot, idx) => {
        const subjectId = wmSubjectIds[idx];
        if (wmChaptersSnapshot.exists()) {
          for (const [chapterId, chapterData] of Object.entries(wmChaptersSnapshot.val())) {
            if (chapterData.source === 'mock') {
              wmChapterIds.push({ subjectId, chapterId });
              deletePromises.push(remove(ref(database, `wordMeaning/chapters/${subjectId}/${chapterId}`)));
            }
          }
        }
      });
      
      // Parallel fetch Word Meaning pages
      const wmPagePromises = wmChapterIds.map(({ chapterId }) => 
        get(ref(database, `wordMeaning/pages/${chapterId}`))
      );
      const wmPagesSnapshots = await Promise.all(wmPagePromises);
      
      const wmPageIds = [];
      wmPagesSnapshots.forEach((wmPagesSnapshot, idx) => {
        const { chapterId } = wmChapterIds[idx];
        if (wmPagesSnapshot.exists()) {
          for (const [pageId, pageData] of Object.entries(wmPagesSnapshot.val())) {
            if (pageData.source === 'mock') {
              wmPageIds.push({ chapterId, pageId });
              deletePromises.push(remove(ref(database, `wordMeaning/pages/${chapterId}/${pageId}`)));
            }
          }
        }
      });
      
      // Parallel fetch Word Meaning questions
      const wmQuestionPromises = wmPageIds.map(({ pageId }) => 
        get(ref(database, `wordMeaning/questions/${pageId}`))
      );
      const wmQuestionsSnapshots = await Promise.all(wmQuestionPromises);
      
      wmQuestionsSnapshots.forEach((wmQuestionsSnapshot, idx) => {
        const { pageId } = wmPageIds[idx];
        if (wmQuestionsSnapshot.exists()) {
          for (const [questionId, questionData] of Object.entries(wmQuestionsSnapshot.val())) {
            if (questionData.source === 'mock') {
              deletePromises.push(remove(ref(database, `wordMeaning/questions/${pageId}/${questionId}`)));
            }
          }
        }
      });
    }
    
    // Execute all deletions in parallel - MUCH FASTER!
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error removing mock data:', error);
    return { success: false, error: error.message };
  }
};

// Clear All Data (except admin credentials)
export const clearAllData = async (selection = null) => {
  try {
    // If no selection provided, clear everything (backward compatibility)
    if (!selection) {
      await remove(ref(database, 'subjects'));
      await remove(ref(database, 'chapters'));
      await remove(ref(database, 'questions'));
      await remove(ref(database, 'reports'));
      await remove(ref(database, 'backups'));
      return { success: true };
    }
    
    // Selective deletion based on selection object
    if (selection.subjects) {
      await remove(ref(database, 'subjects'));
    }
    
    if (selection.chapters) {
      await remove(ref(database, 'chapters'));
    }
    
    if (selection.questions) {
      await remove(ref(database, 'questions'));
    }
    
    if (selection.reports) {
      await remove(ref(database, 'reports'));
    }
    
    if (selection.backups) {
      await remove(ref(database, 'backups'));
    }
    
    // Always preserve:
    // - Admin credentials (admin node)
    // - Class data (classes node)
    
    return { success: true };
  } catch (error) {
    console.error('Error clearing data:', error);
    return { success: false, error: error.message };
  }
};


// ==================== WORD MEANING SECTION ====================

// Word Meaning Subjects
export const createWordMeaningSubject = async (subjectData) => {
  try {
    const subjectsRef = ref(database, 'wordMeaning/subjects');
    const newSubjectRef = push(subjectsRef);
    await set(newSubjectRef, {
      ...subjectData,
      id: newSubjectRef.key,
      createdAt: Date.now()
    });
    return { success: true, id: newSubjectRef.key };
  } catch (error) {
    console.error('Error creating word meaning subject:', error);
    return { success: false, error: error.message };
  }
};

export const getWordMeaningSubjects = async () => {
  try {
    const subjectsRef = ref(database, 'wordMeaning/subjects');
    const snapshot = await get(subjectsRef);
    if (snapshot.exists()) {
      const subjects = [];
      snapshot.forEach((childSnapshot) => {
        subjects.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      return subjects;
    }
    return [];
  } catch (error) {
    console.error('Error fetching word meaning subjects:', error);
    return [];
  }
};

export const updateWordMeaningSubject = async (subjectId, updates) => {
  try {
    const subjectRef = ref(database, `wordMeaning/subjects/${subjectId}`);
    await update(subjectRef, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating word meaning subject:', error);
    return { success: false, error: error.message };
  }
};

export const deleteWordMeaningSubject = async (subjectId) => {
  try {
    const subjectRef = ref(database, `wordMeaning/subjects/${subjectId}`);
    await remove(subjectRef);
    
    // Also delete all chapters and pages for this subject
    const chaptersRef = ref(database, `wordMeaning/chapters/${subjectId}`);
    await remove(chaptersRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting word meaning subject:', error);
    return { success: false, error: error.message };
  }
};

// Word Meaning Chapters
export const createWordMeaningChapter = async (subjectId, chapterData) => {
  try {
    const chaptersRef = ref(database, `wordMeaning/chapters/${subjectId}`);
    const newChapterRef = push(chaptersRef);
    await set(newChapterRef, {
      ...chapterData,
      id: newChapterRef.key,
      subjectId,
      createdAt: Date.now()
    });
    
    // Update subject's chapter count
    await updateWordMeaningSubjectChapterCount(subjectId);
    
    return { success: true, id: newChapterRef.key };
  } catch (error) {
    console.error('Error creating word meaning chapter:', error);
    return { success: false, error: error.message };
  }
};

export const getWordMeaningChapters = async (subjectId) => {
  try {
    const chaptersRef = ref(database, `wordMeaning/chapters/${subjectId}`);
    const snapshot = await get(chaptersRef);
    if (snapshot.exists()) {
      const chapters = [];
      snapshot.forEach((childSnapshot) => {
        chapters.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      // Sort by serial number
      return chapters.sort((a, b) => a.serial - b.serial);
    }
    return [];
  } catch (error) {
    console.error('Error fetching word meaning chapters:', error);
    return [];
  }
};

export const updateWordMeaningChapter = async (subjectId, chapterId, updates) => {
  try {
    const chapterRef = ref(database, `wordMeaning/chapters/${subjectId}/${chapterId}`);
    await update(chapterRef, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating word meaning chapter:', error);
    return { success: false, error: error.message };
  }
};

export const deleteWordMeaningChapter = async (subjectId, chapterId) => {
  try {
    const chapterRef = ref(database, `wordMeaning/chapters/${subjectId}/${chapterId}`);
    await remove(chapterRef);
    
    // Also delete all pages and questions for this chapter
    const pagesRef = ref(database, `wordMeaning/pages/${chapterId}`);
    await remove(pagesRef);
    
    // Update subject's chapter count
    await updateWordMeaningSubjectChapterCount(subjectId);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting word meaning chapter:', error);
    return { success: false, error: error.message };
  }
};

// Update subject chapter count helper
const updateWordMeaningSubjectChapterCount = async (subjectId) => {
  try {
    const chapters = await getWordMeaningChapters(subjectId);
    await updateWordMeaningSubject(subjectId, { totalChapters: chapters.length });
  } catch (error) {
    console.error('Error updating word meaning subject chapter count:', error);
  }
};

// Word Meaning Pages
export const createWordMeaningPage = async (chapterId, pageData) => {
  try {
    const pagesRef = ref(database, `wordMeaning/pages/${chapterId}`);
    const newPageRef = push(pagesRef);
    await set(newPageRef, {
      ...pageData,
      id: newPageRef.key,
      chapterId,
      createdAt: Date.now()
    });
    
    // Update chapter's page count
    await updateWordMeaningChapterPageCount(chapterId);
    
    return { success: true, id: newPageRef.key };
  } catch (error) {
    console.error('Error creating word meaning page:', error);
    return { success: false, error: error.message };
  }
};

export const getWordMeaningPages = async (chapterId) => {
  try {
    const pagesRef = ref(database, `wordMeaning/pages/${chapterId}`);
    const snapshot = await get(pagesRef);
    if (snapshot.exists()) {
      const pages = [];
      snapshot.forEach((childSnapshot) => {
        pages.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      // Sort by page number
      return pages.sort((a, b) => a.pageNumber - b.pageNumber);
    }
    return [];
  } catch (error) {
    console.error('Error fetching word meaning pages:', error);
    return [];
  }
};

export const updateWordMeaningPage = async (chapterId, pageId, updates) => {
  try {
    const pageRef = ref(database, `wordMeaning/pages/${chapterId}/${pageId}`);
    await update(pageRef, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating word meaning page:', error);
    return { success: false, error: error.message };
  }
};

export const deleteWordMeaningPage = async (chapterId, pageId) => {
  try {
    const pageRef = ref(database, `wordMeaning/pages/${chapterId}/${pageId}`);
    await remove(pageRef);
    
    // Also delete all questions for this page
    const questionsRef = ref(database, `wordMeaning/questions/${pageId}`);
    await remove(questionsRef);
    
    // Update chapter's page count
    await updateWordMeaningChapterPageCount(chapterId);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting word meaning page:', error);
    return { success: false, error: error.message };
  }
};

// Update chapter page count helper
const updateWordMeaningChapterPageCount = async (chapterId) => {
  try {
    const pages = await getWordMeaningPages(chapterId);
    // Find the chapter path
    const chapterPath = await findWordMeaningChapterPath(chapterId);
    if (chapterPath) {
      await update(ref(database, chapterPath), { totalPages: pages.length });
    }
  } catch (error) {
    console.error('Error updating word meaning chapter page count:', error);
  }
};

// Helper to find word meaning chapter path
const findWordMeaningChapterPath = async (chapterId) => {
  try {
    const chaptersRef = ref(database, 'wordMeaning/chapters');
    const snapshot = await get(chaptersRef);
    if (snapshot.exists()) {
      let foundPath = null;
      snapshot.forEach((subjectSnapshot) => {
        subjectSnapshot.forEach((chapterSnapshot) => {
          if (chapterSnapshot.key === chapterId) {
            foundPath = `wordMeaning/chapters/${subjectSnapshot.key}/${chapterId}`;
          }
        });
      });
      return foundPath;
    }
    return null;
  } catch (error) {
    console.error('Error finding word meaning chapter path:', error);
    return null;
  }
};

// Word Meaning Questions
export const uploadWordMeaningQuestions = async (pageId, questions) => {
  try {
    const questionsRef = ref(database, `wordMeaning/questions/${pageId}`);
    
    // Replace all questions for this page
    await remove(questionsRef);
    
    for (const question of questions) {
      const newQuestionRef = push(questionsRef);
      await set(newQuestionRef, {
        ...question,
        id: newQuestionRef.key,
        pageId,
        verified: question.verified || false
      });
    }
    
    // Update page's question count
    const pagePath = await findWordMeaningPagePath(pageId);
    if (pagePath) {
      await update(ref(database, pagePath), {
        questionCount: questions.length
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error uploading word meaning questions:', error);
    return { success: false, error: error.message };
  }
};

export const getWordMeaningQuestions = async (pageId) => {
  try {
    const questionsRef = ref(database, `wordMeaning/questions/${pageId}`);
    const snapshot = await get(questionsRef);
    if (snapshot.exists()) {
      const questions = [];
      snapshot.forEach((childSnapshot) => {
        questions.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      return questions;
    }
    return [];
  } catch (error) {
    console.error('Error fetching word meaning questions:', error);
    return [];
  }
};

// Get questions by multiple pages (for combined quiz)
export const getWordMeaningQuestionsByPages = async (pageIds) => {
  try {
    const allQuestions = [];
    for (const pageId of pageIds) {
      const questions = await getWordMeaningQuestions(pageId);
      allQuestions.push(...questions);
    }
    return allQuestions;
  } catch (error) {
    console.error('Error fetching word meaning questions by pages:', error);
    return [];
  }
};

// Helper to find word meaning page path
const findWordMeaningPagePath = async (pageId) => {
  try {
    const pagesRef = ref(database, 'wordMeaning/pages');
    const snapshot = await get(pagesRef);
    if (snapshot.exists()) {
      let foundPath = null;
      snapshot.forEach((chapterSnapshot) => {
        chapterSnapshot.forEach((pageSnapshot) => {
          if (pageSnapshot.key === pageId) {
            foundPath = `wordMeaning/pages/${chapterSnapshot.key}/${pageId}`;
          }
        });
      });
      return foundPath;
    }
    return null;
  } catch (error) {
    console.error('Error finding word meaning page path:', error);
    return null;
  }
};

