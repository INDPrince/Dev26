import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Flag, CheckCircle, Trash2, Edit, AlertTriangle, Shield, ChevronDown, X, History } from 'lucide-react';
import { Button } from '../components/ui/button';
import { getAllReports, updateReportStatus, deleteReport, markQuestionAsVerified, unmarkQuestionAsVerified, getQuestionsByChapter, getAllSubjects, getChaptersBySubject } from '../firebase/services';
import { toast } from '../hooks/use-toast';
import QuestionEditHistoryDialog from '../components/QuestionEditHistoryDialog';

const AdminReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  useEffect(() => {
    // Check auth
    const isAuth = localStorage.getItem('adminAuth');
    if (!isAuth) {
      navigate('/admin/login');
      return;
    }
    loadReports();
  }, [navigate]);

  const loadReports = async () => {
    setLoading(true);
    const allReports = await getAllReports();
    setReports(allReports);
    const pendingCount = allReports.filter(r => r.status === 'pending').length;
    setPendingReportsCount(pendingCount);
    setLoading(false);
  };

  const handleMarkAsVerified = async (report) => {
    const result = await markQuestionAsVerified(report.questionId);
    if (result.success) {
      await updateReportStatus(report.id, 'verified');
      toast({
        title: '✅ Success',
        description: 'Question marked as verified with shield icon.',
        className: 'bg-emerald-50 border-emerald-200',
      });
      loadReports();
    } else {
      toast({
        title: '❌ Error',
        description: 'Failed to mark as verified.',
        variant: 'destructive',
      });
    }
  };

  const handleResolveReport = async (reportId) => {
    const result = await updateReportStatus(reportId, 'resolved');
    if (result.success) {
      toast({
        title: '✅ Success',
        description: 'Report marked as resolved.',
        className: 'bg-emerald-50 border-emerald-200',
      });
      loadReports();
    }
  };

  const handleDeleteReport = async (reportId) => {
    const result = await deleteReport(reportId);
    if (result.success) {
      toast({
        title: '✅ Success',
        description: 'Report deleted successfully.',
        className: 'bg-emerald-50 border-emerald-200',
      });
      loadReports();
    }
  };

  const handleUpdateQuestion = async (report) => {
    // Navigate to dashboard with report context
    navigate('/admin/dashboard', { 
      state: { 
        openReportUpdate: true,
        reportData: report
      } 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Flag className="w-6 h-6 text-orange-600" />
                  Question Reports
                </h1>
                <p className="text-xs text-gray-500">Manage student-reported questions</p>
              </div>
            </div>
            {pendingReportsCount > 0 && (
              <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg font-bold text-sm">
                {pendingReportsCount} Pending
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-white rounded-2xl p-12 shadow-lg border-2 border-gray-100">
                <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl font-semibold text-gray-400">No reports yet</p>
                <p className="text-sm text-gray-400 mt-2">Student reports will appear here</p>
              </div>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className={`bg-white rounded-xl border-2 p-6 shadow-lg transition-all hover:shadow-xl ${
                  report.status === 'pending'
                    ? 'border-orange-200 bg-gradient-to-r from-orange-50/50 to-white'
                    : report.status === 'verified'
                    ? 'border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-white'
                    : 'border-gray-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-lg text-gray-800">{report.subjectName}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-500">Chapter ID: {report.chapterId?.slice(0, 8)}...</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          report.reportType === 'question'
                            ? 'bg-red-100 text-red-700'
                            : report.reportType === 'options'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {report.reportType === 'question'
                          ? '❌ Question Issue'
                          : report.reportType === 'options'
                          ? '⚠️ Options Issue'
                          : '🔴 Both Issues'}
                      </span>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          report.status === 'pending'
                            ? 'bg-orange-100 text-orange-700'
                            : report.status === 'verified'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {report.status === 'pending' && '⏳ Pending'}
                        {report.status === 'verified' && '✅ Verified'}
                        {report.status === 'resolved' && '✔️ Resolved'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(report.createdAt).toLocaleDateString('en-IN', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>

                {/* Question Text */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Question:</p>
                  <p className="text-sm text-gray-800 font-medium leading-relaxed">{report.questionText}</p>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Student's Feedback:</p>
                  <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 p-3 rounded-lg border border-blue-100">
                    "{report.description}"
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap pt-3 border-t border-gray-100">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedReport(report);
                      setShowHistoryDialog(true);
                    }}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
                  >
                    <History className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                  
                  {report.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleMarkAsVerified(report)}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md"
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Mark Verified
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateQuestion(report)}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Update
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveReport(report.id)}
                        className="border-gray-300"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Resolve
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteReport(report.id)}
                    className="text-red-600 hover:bg-red-50 border-red-200 ml-auto"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Question Edit History Dialog */}
      <QuestionEditHistoryDialog
        isOpen={showHistoryDialog}
        onClose={() => {
          setShowHistoryDialog(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
        onEdit={handleUpdateQuestion}
        onRefresh={loadReports}
      />
      
      <style jsx="true">{`
        @keyframes expand {
          from {
            opacity: 0;
            max-height: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            max-height: 1000px;
            transform: translateY(0);
          }
        }
        
        .animate-expand {
          animation: expand 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AdminReports;
