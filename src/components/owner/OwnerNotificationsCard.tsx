import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CreditCard, MessageSquare, AlertCircle, Info, ChevronRight } from "lucide-react";
import { useOwnerNotifications, useMarkNotificationAsRead, OwnerNotification } from "@/hooks/useOwnerNotifications";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function OwnerNotificationsCard() {
  const { language } = useLanguage();
  const { data: notifications = [] } = useOwnerNotifications();
  const markAsRead = useMarkNotificationAsRead();

  const [selectedNotification, setSelectedNotification] = useState<OwnerNotification | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Show only unread or recent notifications (last 3)
  const displayNotifications = notifications.filter(n => !n.is_read).slice(0, 3);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'subscription':
        return <CreditCard className="h-4 w-4 text-amber-500" />;
      case 'welcome':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'technical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatRelativeTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: language === 'ar' ? ar : enUS,
    });
  };

  const handleNotificationClick = async (notification: OwnerNotification) => {
    setSelectedNotification(notification);
    setDialogOpen(true);
    
    if (!notification.is_read) {
      await markAsRead.mutateAsync(notification.id);
    }
  };

  // Don't show the card if there are no unread notifications
  if (displayNotifications.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">
                {language === 'ar' ? 'إشعارات جديدة' : 'New Notifications'}
              </CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              {displayNotifications.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {displayNotifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className="w-full text-start p-2.5 rounded-md bg-background hover:bg-muted/50 transition-colors border"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {notification.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {formatRelativeTime(notification.created_at)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Full Notification Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              {selectedNotification && getNotificationIcon(selectedNotification.type)}
              <DialogTitle className="text-base">
                {selectedNotification?.title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              {selectedNotification && formatRelativeTime(selectedNotification.created_at)}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="px-4 pb-4">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {selectedNotification?.message}
            </div>
            {selectedNotification?.type && (
              <div className="mt-4 pt-3 border-t">
                <Badge variant="outline" className="text-xs">
                  {selectedNotification.type === 'subscription' && (language === 'ar' ? 'اشتراك' : 'Subscription')}
                  {selectedNotification.type === 'welcome' && (language === 'ar' ? 'ترحيب' : 'Welcome')}
                  {selectedNotification.type === 'technical' && (language === 'ar' ? 'تقني' : 'Technical')}
                  {selectedNotification.type === 'custom' && (language === 'ar' ? 'عام' : 'General')}
                </Badge>
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
