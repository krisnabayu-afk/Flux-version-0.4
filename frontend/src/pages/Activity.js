import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { ClipboardCheck, Play, CheckCircle, Pause, XCircle, Clock, MessageSquarePlus, Send, RotateCcw, Image as ImageIcon, MapPin } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import moment from 'moment';

const API = process.env.REACT_APP_API_URL + '/api';

const Activity = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [progressUpdateInputs, setProgressUpdateInputs] = useState({});
  const [progressUpdateFiles, setProgressUpdateFiles] = useState({}); // NEW: State for files

  // Helper to get coordinates
  const getCoordinates = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log("Geolocation is not supported by this browser.");
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error obtaining location:", error);
          resolve(null);
        }
      );
    });
  };

  useEffect(() => {
    fetchTodaysSchedules();
  }, []);

  const fetchTodaysSchedules = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API + '/activities/today');
      setSchedules(response.data);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
      toast.error("Failed to load today's schedules");
    } finally {
      setLoading(false);
    }
  };

  const submitActivity = async (scheduleId, actionType, additionalData = {}) => {
    try {
      setLoading(true);

      // Get location
      const coords = await getCoordinates();

      const payload = {
        schedule_id: scheduleId,
        action_type: actionType,
        ...additionalData
      };

      if (coords) {
        payload.latitude = coords.latitude;
        payload.longitude = coords.longitude;
      }

      await axios.post(API + '/activities', payload);
      toast.success('Activity recorded successfully');
      setNotes('');
      setReason('');
      setStartModalOpen(false);
      setFinishModalOpen(false);
      setHoldModalOpen(false);
      setHoldModalOpen(false);
      setCancelModalOpen(false);
      setRestoreModalOpen(false);
      setCurrentSchedule(null);
      fetchTodaysSchedules();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record activity');
    } finally {
      setLoading(false);
    }
  };

  const handleStartClick = (schedule) => {
    setCurrentSchedule(schedule);
    setStartModalOpen(true);
  };

  const handleFinishClick = (schedule) => {
    setCurrentSchedule(schedule);
    setFinishModalOpen(true);
  };

  const handleHoldClick = (schedule) => {
    setCurrentSchedule(schedule);
    setHoldModalOpen(true);
  };

  const handleCancelClick = (schedule) => {
    setCurrentSchedule(schedule);
    setCancelModalOpen(true);
  };

  const handleRestoreClick = (schedule) => {
    setCurrentSchedule(schedule);
    setRestoreModalOpen(true);
  };

  const handleStart = async () => {
    if (currentSchedule) {
      await submitActivity(currentSchedule.id, 'start', { notes });
    }
  };

  const handleFinish = async () => {
    if (currentSchedule) {
      await submitActivity(currentSchedule.id, 'finish', { notes });
    }
  };

  const handleHold = async () => {
    if (currentSchedule) {
      await submitActivity(currentSchedule.id, 'hold');
    }
  };

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }
    if (currentSchedule) {
      await submitActivity(currentSchedule.id, 'cancel', { reason });
    }
  };

  const handleRestore = async () => {
    if (currentSchedule) {
      await submitActivity(currentSchedule.id, 'restore');
    }
  };

  const addProgressUpdate = async (activityId, scheduleId) => {
    const updateText = progressUpdateInputs[scheduleId];
    if (!updateText || !updateText.trim()) {
      toast.error('Please enter an update');
      return;
    }
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('activity_id', activityId);
      formData.append('update_text', updateText);

      if (progressUpdateFiles[scheduleId]) {
        formData.append('file', progressUpdateFiles[scheduleId]);
      }

      // Get location
      const coords = await getCoordinates();
      if (coords) {
        formData.append('latitude', coords.latitude);
        formData.append('longitude', coords.longitude);
      }

      await axios.post(API + '/activities/progress-update', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Progress update added!');
      setProgressUpdateInputs(prev => ({ ...prev, [scheduleId]: '' }));
      setProgressUpdateFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[scheduleId];
        return newFiles;
      });
      fetchTodaysSchedules();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add progress update');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Pending': { color: 'bg-slate-200 text-slate-700', icon: Clock },
      'In Progress': { color: 'bg-blue-100 text-blue-700', icon: Play },
      'Finished': { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      'Cancelled': { color: 'bg-red-100 text-red-700', icon: XCircle },
      'On Hold': { color: 'bg-yellow-100 text-yellow-700', icon: Pause }
    };
    const config = statusConfig[status] || statusConfig['Pending'];
    const Icon = config.icon;
    return (
      <Badge className={config.color + ' flex items-center space-x-1'}>
        <Icon size={12} />
        <span>{status}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2 flex items-center space-x-3">
            <ClipboardCheck className="text-blue-600" size={36} />
            <span>Today's Activities</span>
          </h1>
          <p className="text-slate-600">{moment().format('MMMM DD, YYYY')} - Record your daily task execution</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Your Schedules for Today</h2>
        {loading && schedules.length === 0 ? (
          <div className="text-center py-12"><p className="text-slate-500">Loading schedules...</p></div>
        ) : schedules.length === 0 ? (
          <Card><CardContent className="py-12"><p className="text-center text-slate-500">No schedules assigned for today. Enjoy your day!</p></CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {schedules.map(schedule => (
              <Card key={schedule.id} className="transition-all hover:shadow-md">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-800">{schedule.title}</h3>
                        {schedule.description && (<p className="text-sm text-slate-600 mt-1">{schedule.description}</p>)}
                        <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-2">
                          <div className="flex items-center space-x-1"><Clock size={14} /><span>{moment(schedule.start_date).format('HH:mm')}</span></div>
                          <div><span className="font-medium">Division:</span> {schedule.division}</div>
                        </div>
                      </div>
                      {getStatusBadge(schedule.activity_status)}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {schedule.activity_status === 'Pending' && (
                        <Button onClick={() => handleStartClick(schedule)} disabled={loading} className="bg-blue-500 hover:bg-blue-600" size="sm">
                          <Play size={16} className="mr-1" />Start
                        </Button>
                      )}
                      {schedule.activity_status === 'In Progress' && (
                        <Button onClick={() => handleFinishClick(schedule)} disabled={loading} className="bg-green-500 hover:bg-green-600" size="sm">
                          <CheckCircle size={16} className="mr-1" />Finish
                        </Button>
                      )}
                      {(schedule.activity_status === 'Pending' || schedule.activity_status === 'In Progress') && (
                        <>
                          <Button onClick={() => handleHoldClick(schedule)} disabled={loading} className="bg-yellow-500 hover:bg-yellow-600" size="sm">
                            <Pause size={16} className="mr-1" />Hold
                          </Button>
                          <Button onClick={() => handleCancelClick(schedule)} disabled={loading} variant="destructive" size="sm">
                            <XCircle size={16} className="mr-1" />Cancel
                          </Button>
                        </>
                      )}
                      {schedule.activity_status === 'Finished' && (
                        <Button onClick={() => handleStartClick(schedule)} disabled={loading} className="bg-blue-500 hover:bg-blue-600" size="sm">
                          <RotateCcw size={16} className="mr-1" />Reopen
                        </Button>
                      )}
                      {schedule.activity_status === 'Cancelled' && (
                        <Button onClick={() => handleRestoreClick(schedule)} disabled={loading} className="bg-slate-500 hover:bg-slate-600" size="sm">
                          <RotateCcw size={16} className="mr-1" />Restore
                        </Button>
                      )}
                      {schedule.activity_status === 'On Hold' && (
                        <Button onClick={() => handleStartClick(schedule)} disabled={loading} className="bg-blue-500 hover:bg-blue-600" size="sm">
                          <Play size={16} className="mr-1" />Resume
                        </Button>
                      )}
                    </div>

                    {schedule.latest_activity && (
                      <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                        <p className="text-xs font-semibold text-slate-600">Latest Activity:</p>
                        <p className="text-xs text-slate-600">{schedule.latest_activity.action_type.toUpperCase()} - {moment(schedule.latest_activity.created_at).format('MMM DD, HH:mm')}</p>
                        {schedule.latest_activity.notes && (<p className="text-xs text-slate-500">Notes: {schedule.latest_activity.notes}</p>)}
                        {schedule.latest_activity.reason && (<p className="text-xs text-slate-500">Reason: {schedule.latest_activity.reason}</p>)}
                        {schedule.latest_activity.latitude && schedule.latest_activity.longitude && (
                          <div className="flex items-center space-x-1 mt-1">
                            <MapPin size={12} className="text-blue-500" />
                            <a
                              href={`https://www.google.com/maps?q=${schedule.latest_activity.latitude},${schedule.latest_activity.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View Location
                            </a>
                          </div>
                        )}
                        {schedule.latest_activity.progress_updates && schedule.latest_activity.progress_updates.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-300">
                            <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center"><MessageSquarePlus size={12} className="mr-1" />Progress Updates:</p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {schedule.latest_activity.progress_updates.map((update, idx) => (
                                <div key={idx} className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200">
                                  <div className="flex justify-between items-start">
                                    <span className="flex-1">
                                      {update.update_text}
                                      {update.image_url || update.image_data ? (
                                        <div className="mt-2">
                                          <img
                                            src={update.image_url
                                              ? `${process.env.REACT_APP_API_URL}${update.image_url}`
                                              : `data:image/jpeg;base64,${update.image_data}`}
                                            alt="Update attachment"
                                            className="max-h-32 rounded border border-slate-200"
                                          />
                                        </div>
                                      ) : null}
                                    </span>
                                    <span className="text-[10px] text-slate-400 ml-2 whitespace-nowrap flex flex-col items-end">
                                      <span>{moment(update.timestamp).format('HH:mm')}</span>
                                      {update.latitude && update.longitude && (
                                        <a
                                          href={`https://www.google.com/maps?q=${update.latitude},${update.longitude}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center text-blue-500 hover:text-blue-700 mt-1"
                                          title="View Location"
                                        >
                                          <MapPin size={10} className="mr-0.5" />
                                          <span className="text-[10px]">Map</span>
                                        </a>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {schedule.latest_activity.id && schedule.activity_status === 'In Progress' && (
                          <div className="mt-2 pt-2 border-t border-slate-300">
                            <Label className="text-xs font-semibold text-slate-700 mb-1 block">Add Live Update:</Label>
                            <div className="flex space-x-2">
                              <Input
                                placeholder="What are you working on now?"
                                value={progressUpdateInputs[schedule.id] || ''}
                                onChange={(e) => setProgressUpdateInputs(prev => ({ ...prev, [schedule.id]: e.target.value }))}
                                onKeyPress={(e) => { if (e.key === 'Enter') { addProgressUpdate(schedule.latest_activity.id, schedule.id); } }}
                                className="text-xs"
                                disabled={loading}
                              />
                              <div className="flex items-center space-x-2">
                                <Input
                                  type="file"
                                  id={`file-${schedule.id}`}
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      setProgressUpdateFiles(prev => ({ ...prev, [schedule.id]: e.target.files[0] }));
                                    }
                                  }}
                                  accept="image/*"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={progressUpdateFiles[schedule.id] ? "bg-blue-50 border-blue-200 text-blue-600" : "text-slate-500"}
                                  onClick={() => document.getElementById(`file-${schedule.id}`).click()}
                                  title="Attach Image"
                                >
                                  <ImageIcon size={14} />
                                </Button>
                                <Button size="sm" onClick={() => addProgressUpdate(schedule.latest_activity.id, schedule.id)} disabled={loading || !progressUpdateInputs[schedule.id]?.trim()} className="bg-blue-500 hover:bg-blue-600">
                                  <Send size={14} />
                                </Button>
                              </div>
                            </div>
                            {progressUpdateFiles[schedule.id] && (
                              <div className="text-xs text-blue-600 flex items-center mt-1">
                                <ImageIcon size={10} className="mr-1" />
                                {progressUpdateFiles[schedule.id].name}
                                <button
                                  onClick={() => setProgressUpdateFiles(prev => {
                                    const newFiles = { ...prev };
                                    delete newFiles[schedule.id];
                                    return newFiles;
                                  })}
                                  className="ml-2 text-slate-400 hover:text-red-500"
                                >
                                  <XCircle size={10} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={startModalOpen} onOpenChange={setStartModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2"><Play className="text-blue-600" size={20} /><span>Start Activity</span></DialogTitle>
            <DialogDescription>Record the start of this task. You can add optional notes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4"><div><Label htmlFor="start-notes">Notes (Optional)</Label><Textarea id="start-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any notes about starting this task..." rows={3} /></div></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartModalOpen(false)}>Cancel</Button>
            <Button onClick={handleStart} className="bg-blue-500 hover:bg-blue-600" disabled={loading}>Start Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={finishModalOpen} onOpenChange={setFinishModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2"><CheckCircle className="text-green-600" size={20} /><span>Finish Activity</span></DialogTitle>
            <DialogDescription>Mark this task as finished. You can add completion notes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4"><div><Label htmlFor="finish-notes">Notes (Optional)</Label><Textarea id="finish-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any completion notes..." rows={3} /></div></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinishModalOpen(false)}>Cancel</Button>
            <Button onClick={handleFinish} className="bg-green-500 hover:bg-green-600" disabled={loading}>Finish Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={holdModalOpen} onOpenChange={setHoldModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2"><Pause className="text-yellow-600" size={20} /><span>Put Activity On Hold</span></DialogTitle>
            <DialogDescription>Are you sure you want to put this task on hold? Your manager will be notified.</DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"><p className="text-sm text-yellow-800"><strong>Note:</strong> Your manager will receive a notification about this task being on hold so they can reschedule if needed.</p></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldModalOpen(false)}>Cancel</Button>
            <Button onClick={handleHold} className="bg-yellow-500 hover:bg-yellow-600" disabled={loading}>Confirm Hold</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2"><XCircle className="text-red-600" size={20} /><span>Cancel Activity</span></DialogTitle>
            <DialogDescription>Cancel this task. You must provide a reason for cancellation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4"><div><Label htmlFor="cancel-reason">Reason for Cancellation *</Label><Textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why you are cancelling this task..." rows={3} required /></div></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCancel} variant="destructive" disabled={loading || !reason.trim()}>Cancel Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={restoreModalOpen} onOpenChange={setRestoreModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2"><RotateCcw className="text-slate-600" size={20} /><span>Restore Activity</span></DialogTitle>
            <DialogDescription>Are you sure you want to restore this activity? It will be moved back to Pending status.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRestore} className="bg-slate-800 hover:bg-slate-900" disabled={loading}>Confirm Restore</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Activity;
