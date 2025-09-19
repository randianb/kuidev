import * as React from "react";
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type DateRangeType = "day" | "week" | "month" | "year";

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value?: DateRange | [Date, Date];
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  rangeType?: DateRangeType;
  showRangeTypeSelector?: boolean;
  format?: string;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "选择日期区间",
  disabled = false,
  className,
  rangeType = "day",
  showRangeTypeSelector = true,
  format: dateFormat = "yyyy年MM月dd日"
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentDate, setCurrentDate] = React.useState(new Date());
  // 转换value为统一的DateRange格式
  const normalizeValue = (val?: DateRange | [Date, Date]): DateRange | undefined => {
    if (!val) return undefined;
    if (Array.isArray(val)) {
      return { from: val[0], to: val[1] };
    }
    return val;
  };

  const [selectedRange, setSelectedRange] = React.useState<DateRange | undefined>(normalizeValue(value));
  const [currentRangeType, setCurrentRangeType] = React.useState<DateRangeType>(rangeType);
  const [selectingStart, setSelectingStart] = React.useState(true);

  // 调试日志：监听状态变化
  React.useEffect(() => {
    console.log("🔄 状态变化 - selectingStart:", selectingStart);
  }, [selectingStart]);

  React.useEffect(() => {
    console.log("📊 状态变化 - selectedRange:", selectedRange);
  }, [selectedRange]);

  React.useEffect(() => {
    console.log("🚪 状态变化 - isOpen:", isOpen);
  }, [isOpen]);

  React.useEffect(() => {
    setSelectedRange(normalizeValue(value));
  }, [value]);

  const handleDateSelect = (date: Date) => {
    console.log("🔥 handleDateSelect 被调用");
    console.log("📅 点击的日期:", date.toDateString());
    console.log("🎯 当前范围类型:", currentRangeType);
    console.log("🔄 selectingStart 状态:", selectingStart);
    console.log("📊 当前选中范围:", selectedRange);
    
    if (currentRangeType === "day") {
      console.log("📅 日期模式选择");
      if (selectingStart || !selectedRange) {
        console.log("🎯 第一次点击逻辑");
        // 第一次点击：选择单日
        const newRange = { from: date, to: date };
        console.log("📝 新范围:", newRange);
        setSelectedRange(newRange);
        onChange?.(newRange);
        setSelectingStart(false);
        console.log("🔄 设置 selectingStart 为 false");
      } else {
        console.log("✅ 第二次点击逻辑");
        // 第二次点击：如果点击同一天，确认选择并关闭；否则选择区间
        if (date.getTime() === selectedRange.from.getTime()) {
          console.log("🎯 点击同一天，确认选择");
          setIsOpen(false);
          setSelectingStart(true);
        } else {
          console.log("📝 选择不同日期，创建区间");
          const newRange = {
            from: date < selectedRange.from ? date : selectedRange.from,
            to: date > selectedRange.from ? date : selectedRange.from
          };
          console.log("📝 新区间:", newRange);
          setSelectedRange(newRange);
          onChange?.(newRange);
          setIsOpen(false);
          setSelectingStart(true);
        }
      }
    } else {
      // 对于周/月/年模式，支持跨区间选择
      if (selectingStart || !selectedRange) {
        // 选择起始区间
        let from: Date, to: Date;
        
        switch (currentRangeType) {
          case "week":
            from = startOfWeek(date, { weekStartsOn: 1 });
            to = endOfWeek(date, { weekStartsOn: 1 });
            break;
          case "month":
            from = startOfMonth(date);
            to = endOfMonth(date);
            break;
          case "year":
            from = startOfYear(date);
            to = endOfYear(date);
            break;
          default:
            from = date;
            to = date;
        }
        
        const newRange = { from, to };
        setSelectedRange(newRange);
        setSelectingStart(false);
      } else {
        // 选择结束区间，支持跨多个区间
        let clickedFrom: Date, clickedTo: Date;
        
        switch (currentRangeType) {
          case "week":
            clickedFrom = startOfWeek(date, { weekStartsOn: 1 });
            clickedTo = endOfWeek(date, { weekStartsOn: 1 });
            break;
          case "month":
            clickedFrom = startOfMonth(date);
            clickedTo = endOfMonth(date);
            break;
          case "year":
            clickedFrom = startOfYear(date);
            clickedTo = endOfYear(date);
            break;
          default:
            clickedFrom = date;
            clickedTo = date;
        }
        
        // 确定最终的起始和结束日期
        const finalFrom = clickedFrom < selectedRange.from ? clickedFrom : selectedRange.from;
        const finalTo = clickedTo > selectedRange.to ? clickedTo : selectedRange.to;
        
        const newRange = { from: finalFrom, to: finalTo };
        setSelectedRange(newRange);
        onChange?.(newRange);
        setIsOpen(false);
        setSelectingStart(true);
      }
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
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days = [];
    
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({ date, isCurrentMonth: true });
    }
    
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

  const isInRange = (date: Date) => {
    if (!selectedRange) return false;
    return date >= selectedRange.from && date <= selectedRange.to;
  };

  const isRangeStart = (date: Date) => {
    return selectedRange && date.toDateString() === selectedRange.from.toDateString();
  };

  const isRangeEnd = (date: Date) => {
    return selectedRange && date.toDateString() === selectedRange.to.toDateString();
  };

  const getPreviewRange = (date: Date) => {
    if (currentRangeType === "day" && (!selectedRange || selectingStart)) return null;
    
    if (currentRangeType === "day" && selectedRange && !selectingStart) {
      // 日期模式下的预览
      return {
        from: date < selectedRange.from ? date : selectedRange.from,
        to: date > selectedRange.from ? date : selectedRange.from
      };
    }
    
    if (!selectedRange || selectingStart) {
      // 首次选择时的预览
      switch (currentRangeType) {
        case "week":
          return {
            from: startOfWeek(date, { weekStartsOn: 1 }),
            to: endOfWeek(date, { weekStartsOn: 1 })
          };
        case "month":
          return {
            from: startOfMonth(date),
            to: endOfMonth(date)
          };
        case "year":
          return {
            from: startOfYear(date),
            to: endOfYear(date)
          };
        default:
          return null;
      }
    } else {
      // 跨区间选择时的预览
      let clickedFrom: Date, clickedTo: Date;
      
      switch (currentRangeType) {
        case "week":
          clickedFrom = startOfWeek(date, { weekStartsOn: 1 });
          clickedTo = endOfWeek(date, { weekStartsOn: 1 });
          break;
        case "month":
          clickedFrom = startOfMonth(date);
          clickedTo = endOfMonth(date);
          break;
        case "year":
          clickedFrom = startOfYear(date);
          clickedTo = endOfYear(date);
          break;
        default:
          clickedFrom = date;
          clickedTo = date;
      }
      
      return {
        from: clickedFrom < selectedRange.from ? clickedFrom : selectedRange.from,
        to: clickedTo > selectedRange.to ? clickedTo : selectedRange.to
      };
    }
  };

  const [hoveredDate, setHoveredDate] = React.useState<Date | null>(null);
  const previewRange = hoveredDate ? getPreviewRange(hoveredDate) : null;

  const isInPreviewRange = (date: Date) => {
    if (!previewRange) return false;
    return date >= previewRange.from && date <= previewRange.to;
  };

  const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  const formatDisplayText = () => {
    if (!selectedRange) return placeholder;
    
    if (currentRangeType === "day" && selectedRange.from.toDateString() === selectedRange.to.toDateString()) {
      return format(selectedRange.from, dateFormat);
    }
    
    return `${format(selectedRange.from, dateFormat)} - ${format(selectedRange.to, dateFormat)}`;
  };

  const RangeCalendar = () => (
    <div className="p-4">
      {/* 区间类型选择 */}
      {showRangeTypeSelector && (
        <div className="mb-4">
          <Select value={currentRangeType} onValueChange={(value: DateRangeType) => {
            setCurrentRangeType(value);
            setSelectedRange(undefined);
            setSelectingStart(true);
          }}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">按日选择</SelectItem>
              <SelectItem value="week">按周选择</SelectItem>
              <SelectItem value="month">按月选择</SelectItem>
              <SelectItem value="year">按年选择</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 头部导航 */}
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
          <div key={day} className="h-9 flex items-center justify-center text-xs text-muted-foreground font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {getDaysInMonth(currentDate).map((dayObj, index) => {
          const isInCurrentRange = isInRange(dayObj.date);
          const isInCurrentPreview = isInPreviewRange(dayObj.date);
          const isStart = isRangeStart(dayObj.date);
          const isEnd = isRangeEnd(dayObj.date);
          
          return (
            <Button
              key={index}
              variant="ghost"
              className={cn(
                "h-9 w-9 p-0 text-sm font-normal relative flex items-center justify-center transition-all duration-150",
                !dayObj.isCurrentMonth && "text-muted-foreground opacity-50",
                isToday(dayObj.date) && "font-bold",
                isInCurrentRange && "bg-primary/20 text-primary",
                isInCurrentPreview && !isInCurrentRange && "bg-muted",
                (isStart || isEnd) && "bg-primary text-primary-foreground",
                "cursor-pointer",
                "hover:bg-primary/10 hover:text-primary hover:scale-105",
                !dayObj.isCurrentMonth && "hover:bg-muted/50"
              )}
              onMouseDown={() => handleDateSelect(dayObj.date)}
              onMouseEnter={() => setHoveredDate(dayObj.date)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              {dayObj.date.getDate()}
            </Button>
          );
        })}
      </div>

      {/* 状态提示 */}
      {selectedRange && selectingStart === false && (
        <div className="mt-4 text-xs text-muted-foreground text-center">
          {currentRangeType === "day" 
            ? "已选择单日，点击其他日期选择区间，或点击同一日期确认" 
            : `点击结束${currentRangeType === "week" ? "周" : currentRangeType === "month" ? "月" : "年"}完成跨区间选择`}
        </div>
      )}
      
      {/* 操作说明 */}
      {!selectedRange && (
        <div className="mt-4 text-xs text-muted-foreground text-center">
          {currentRangeType === "day" 
            ? "点击日期选择单日，或点击两个日期选择区间" 
            : `点击${currentRangeType === "week" ? "周" : currentRangeType === "month" ? "月" : "年"}选择区间`}
        </div>
      )}

      {/* 快捷操作 */}
      <div className="flex justify-between mt-4 pt-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const today = new Date();
            let range: DateRange;
            
            switch (currentRangeType) {
              case "week":
                range = {
                  from: startOfWeek(today, { weekStartsOn: 1 }),
                  to: endOfWeek(today, { weekStartsOn: 1 })
                };
                break;
              case "month":
                range = {
                  from: startOfMonth(today),
                  to: endOfMonth(today)
                };
                break;
              case "year":
                range = {
                  from: startOfYear(today),
                  to: endOfYear(today)
                };
                break;
              default:
                range = { from: today, to: today };
            }
            
            setSelectedRange(range);
            onChange?.(range);
            setIsOpen(false);
          }}
          className="text-xs"
        >
          {currentRangeType === "day" ? "今天" : 
           currentRangeType === "week" ? "本周" :
           currentRangeType === "month" ? "本月" : "今年"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedRange(undefined);
            setSelectingStart(true);
          }}
          className="text-xs"
        >
          清除
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="text-xs"
        >
          取消
        </Button>
      </div>
    </div>
  );

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      console.log("🚪 弹窗状态变化:", open);
      setIsOpen(open);
      if (open) {
        console.log("🔄 弹窗打开 - 重置 selectingStart 为 true");
        setSelectingStart(true);
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between text-left font-normal",
            !selectedRange && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDisplayText()}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <RangeCalendar />
      </PopoverContent>
    </Popover>
  );
}