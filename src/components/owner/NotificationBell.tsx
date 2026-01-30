import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, CheckCheck, AlertCircle, Info, CreditCard, MessageSquare } from "lucide-react";
import { 
  useOwnerNotifications, 
  useUnreadNotificationsCount, 
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  OwnerNotification 
} from "@/hooks/useOwnerNotifications";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

export function NotificationBell() {
  const { language } = useLanguage();
  const { data: notifications = [], isLoading } = useOwnerNotifications();
  const unreadCount = useUnreadNotificationsCount();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const [selectedNotification, setSelectedNotification] = useState<OwnerNotification | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const handleMarkAllAsRead = async () => {
    await markAllAsRead.mutateAsync();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative h-7 w-7 p-0 text-blue-700 dark:text-blue-200 hover:text-blue-900 dark:hover:text-white hover:bg-blue-200 dark:hover:bg-blue-800"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-sm font-semibold">
              {language === 'ar' ? 'الإشعارات' : 'Notifications'}
            </span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-primary"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsRead.isPending}
              >
                <CheckCheck className="h-3 w-3 me-1" />
                {language === 'ar' ? 'قراءة الكل' : 'Mark all read'}
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <ScrollArea className="max-h-80">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {language === 'ar' ? 'جار التحميل...' : 'Loading...'}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.slice(0, 10).map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-start p-3 hover:bg-green-100/70 dark:hover:bg-green-900/30 ${
                      !notification.is_read ? 'bg-green-50 dark:bg-green-900/20' : 'bg-green-50/50 dark:bg-green-950/10'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm line-clamp-1 ${!notification.is_read ? 'font-semibold' : ''}`}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 10 && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2 text-center">
                <span className="text-xs text-muted-foreground">
                  {language === 'ar' 
                    ? `عرض ${10} من ${notifications.length} إشعار`
                    : `Showing 10 of ${notifications.length} notifications`
                  }
                </span>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
