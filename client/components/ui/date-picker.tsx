import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "minimal" | "modern";
  format?: string;
  
  // 高级设置
  showQuickSelect?: boolean;
  quickSelectOptions?: Array<{
    label: string;
    value: Date | (() => Date);
  }>;
  disableWeekends?: boolean;
  disablePastDates?: boolean;
  disableFutureDates?: boolean;
  customDisabledDates?: Date[] | ((date: Date) => boolean);
  minDate?: Date;
  maxDate?: Date;
  locale?: "zh" | "en";
  weekStartsOn?: 0 | 1; // 0: 周日开始, 1: 周一开始
  showToday?: boolean;
  autoClose?: boolean;
  customTheme?: {
    primaryColor?: string;
    borderRadius?: string;
    fontSize?: string;
  };
  enableAnimation?: boolean;
  onDateHover?: (date: Date) => void;
  validateDate?: (date: Date) => boolean | string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "选择日期",
  disabled = false,
  className,
  variant = "modern",
  format: dateFormat = "yyyy年MM月dd日",
  
  // 高级设置
  showQuickSelect = true,
  quickSelectOptions = [
    { label: "今天", value: () => new Date() },
    { label: "昨天", value: () => new Date(Date.now() - 24 * 60 * 60 * 1000) },
    { label: "明天", value: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
    { label: "一周后", value: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
  ],
  disableWeekends = false,
  disablePastDates = false,
  disableFutureDates = false,
  customDisabledDates,
  minDate,
  maxDate,
  locale = "zh",
  weekStartsOn = 1,
  showToday = true,
  autoClose = true,
  customTheme,
  enableAnimation = true,
  onDateHover,
  validateDate
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value);

  React.useEffect(() => {
    setSelectedDate(value);
  }, [value]);

  // 检查日期是否被禁用
  const isDateDisabled = (date: Date) => {
    // 检查最小/最大日期
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    
    // 检查过去/未来日期
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    if (disablePastDates && checkDate < today) return true;
    if (disableFutureDates && checkDate > today) return true;
    
    // 检查周末
    if (disableWeekends) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return true;
    }
    
    // 检查自定义禁用日期
    if (customDisabledDates) {
      if (Array.isArray(customDisabledDates)) {
        return customDisabledDates.some(disabledDate => 
          date.toDateString() === disabledDate.toDateString()
        );
      } else if (typeof customDisabledDates === 'function') {
        return customDisabledDates(date);
      }
    }
    
    return false;
  };

  // 验证日期
  const validateDateSelection = (date: Date) => {
    if (validateDate) {
      const result = validateDate(date);
      if (typeof result === 'string') {
        console.warn('日期验证失败:', result);
        return false;
      }
      return result;
    }
    return true;
  };

  // 获取本地化文本
  const getLocalizedText = () => {
    if (locale === 'en') {
      return {
        weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        today: 'Today',
        cancel: 'Cancel'
      };
    }
    return {
      weekdays: ['一', '二', '三', '四', '五', '六', '日'],
      months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
      today: '今天',
      cancel: '取消'
    };
  };

  const localizedText = getLocalizedText();

  const handleDateSelect = (date: Date) => {
    // 检查日期是否被禁用
    if (isDateDisabled(date)) {
      return;
    }
    
    // 验证日期
    if (!validateDateSelection(date)) {
      return;
    }
    
    setSelectedDate(date);
    onChange?.(date);
    
    if (autoClose) {
      setIsOpen(false);
    }
  };

  const handleMonthChange = (increment: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + increment);
      return newDate;
    });
  };

  const handleYearChange = (increment: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setFullYear(newDate.getFullYear() + increment);
      return newDate;
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // 根据weekStartsOn调整起始日
    const startingDayOfWeek = weekStartsOn === 0 
      ? firstDay.getDay() 
      : (firstDay.getDay() + 6) % 7;

    const days = [];
    
    // 添加上个月的日期
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    // 添加当前月的日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({ date, isCurrentMonth: true });
    }
    
    // 添加下个月的日期以填满6行
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day);
      days.push({ date: nextDate, isCurrentMonth: false });
    }
    
    return days;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  // 根据weekStartsOn调整星期显示
  const weekdays = weekStartsOn === 0 
    ? (locale === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['日', '一', '二', '三', '四', '五', '六'])
    : localizedText.weekdays;
  const months = localizedText.months;

  const ModernCalendar = () => (
    <div className="p-4">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleYearChange(-1)}
            className="h-8 w-8 p-0"
          >
            ‹‹
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleMonthChange(-1)}
            className="h-8 w-8 p-0"
          >
            ‹
          </Button>
        </div>
        
        <div className="text-sm font-medium">
          {currentDate.getFullYear()}年 {months[currentDate.getMonth()]}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleMonthChange(1)}
            className="h-8 w-8 p-0"
          >
            ›
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleYearChange(1)}
            className="h-8 w-8 p-0"
          >
            ››
          </Button>
        </div>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map((day) => (
          <div key={day} className="h-8 flex items-center justify-center text-xs text-muted-foreground font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {getDaysInMonth(currentDate).map((dayObj, index) => {
          const isDisabled = isDateDisabled(dayObj.date);
          return (
            <Button
              key={index}
              variant="ghost"
              disabled={isDisabled}
              className={cn(
                "h-8 w-8 p-0 text-sm font-normal transition-all",
                !dayObj.isCurrentMonth && "text-muted-foreground opacity-50",
                isToday(dayObj.date) && showToday && "bg-accent text-accent-foreground",
                isSelected(dayObj.date) && "bg-primary text-primary-foreground hover:bg-primary",
                isDisabled && "opacity-50 cursor-not-allowed",
                !isDisabled && "hover:bg-accent hover:text-accent-foreground",
                enableAnimation && "transition-all duration-200",
                customTheme?.borderRadius && `rounded-[${customTheme.borderRadius}]`,
                customTheme?.fontSize && `text-[${customTheme.fontSize}]`
              )}
              style={{
                backgroundColor: isSelected(dayObj.date) && customTheme?.primaryColor 
                  ? customTheme.primaryColor 
                  : undefined
              }}
              onClick={() => !isDisabled && handleDateSelect(dayObj.date)}
              onMouseEnter={() => onDateHover?.(dayObj.date)}
            >
              {dayObj.date.getDate()}
            </Button>
          );
        })}
      </div>

      {/* 快捷选择 */}
      {showQuickSelect && (
        <div className="mt-4 pt-3 border-t">
          <div className="grid grid-cols-2 gap-2 mb-2">
            {quickSelectOptions.map((option, index) => {
              const optionDate = typeof option.value === 'function' ? option.value() : option.value;
              const isDisabled = isDateDisabled(optionDate);
              return (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && handleDateSelect(optionDate)}
                  className={cn(
                    "text-xs h-7",
                    isDisabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
          <div className="flex justify-between">
            {showToday && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDateSelect(new Date())}
                className="text-xs"
                disabled={isDateDisabled(new Date())}
              >
                {localizedText.today}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-xs ml-auto"
            >
              {localizedText.cancel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (variant === "minimal") {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "justify-start text-left font-normal border-b border-border rounded-none px-0 h-8",
              !selectedDate && "text-muted-foreground",
              className
            )}
            disabled={disabled}
          >
            {selectedDate ? format(selectedDate, dateFormat) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <ModernCalendar />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, dateFormat) : placeholder}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <ModernCalendar />
      </PopoverContent>
    </Popover>
  );
}