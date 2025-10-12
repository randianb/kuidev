import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, X, Folder, FolderOpen, FileText, Plus, Edit, Search, Trash2, Minus, Navigation, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { PageMeta, PageGroup } from '@/studio/types';
import { navigateToPage } from '@/lib/navigation';

interface PageTreeViewProps {
  pages: PageMeta[];
  groups: PageGroup[];
  currentPageId: string;
  selectedPageId: string | null;
  onPageSelect: (page: PageMeta) => void;
  onPageFocus: (pageId: string) => void;
  onPagePreload: (pageId: string) => void;
  onPageCopy: (page: PageMeta) => void;
  onPageDelete: (page: PageMeta) => void;
  onGroupCreate: () => void;
  onGroupEdit: (group: PageGroup) => void;
  onGroupDelete: (group: PageGroup) => void;
  onPageMoveToGroup: (page: PageMeta, groupId: string | undefined) => void;
  onPageCreateInGroup: (groupId: string) => void;
  // 在自定义分组内拖拽排序后的回调（仅当无搜索条件时启用拖拽）
  onGroupReorderPages?: (groupId: string, orderedPageIds: string[]) => void;
}

export function PageTreeView({
  pages,
  groups,
  currentPageId,
  selectedPageId,
  onPageSelect,
  onPageFocus,
  onPagePreload,
  onPageCopy,
  onPageDelete,
  onGroupCreate,
  onGroupEdit,
  onGroupDelete,
  onPageMoveToGroup,
  onPageCreateInGroup,
  onGroupReorderPages,
}: PageTreeViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['recent', 'custom-groups', 'templates']));
  const [searchTerm, setSearchTerm] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    groupId: string;
  } | null>(null);
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
  const [dragOverPageId, setDragOverPageId] = useState<string | null>(null);

  // 过滤搜索结果
  const filteredPages = pages.filter(page => 
    searchTerm === '' || 
    page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (page.template && page.template.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 获取最近的页面（按更新时间排序，取前5个，排除已分组的页面）
  const recentPages = filteredPages
    .filter(page => !page.groupId)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 5);

  // 按模板类型分组（排除已分组的页面）
  const templateGroups = filteredPages
    .filter(page => !page.groupId)
    .reduce((acc, page) => {
      const template = page.template || 'default';
      if (!acc[template]) {
        acc[template] = [];
      }
      acc[template].push(page);
      return acc;
    }, {} as Record<string, PageMeta[]>);

  // 按自定义分组组织页面
  const customGroupedPages = groups.reduce((acc, group) => {
    acc[group.id] = filteredPages.filter(page => page.groupId === group.id);
    return acc;
  }, {} as Record<string, PageMeta[]>);

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderPageCard = (page: PageMeta, groupId?: string) => {
    const isSelected = selectedPageId === page.id;
    const isCurrent = currentPageId === page.id;

    return (
      <ContextMenu key={page.id}>
        <ContextMenuTrigger asChild>
          <div
            className={`ml-6 p-3 border rounded-lg cursor-pointer transition-all relative group ${
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : isCurrent
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } ${dragOverPageId === page.id ? 'ring-2 ring-primary' : ''}`}
            onClick={() => onPageSelect(page)}
            onMouseEnter={() => onPagePreload(page.id)}
            draggable={Boolean(groupId) && searchTerm === ''}
            onDragStart={(e) => {
              if (!groupId || searchTerm !== '') return;
              setDraggingPageId(page.id);
              try { e.dataTransfer.setData('text/plain', page.id); } catch {}
            }}
            onDragOver={(e) => {
              if (!groupId || searchTerm !== '') return;
              e.preventDefault();
              setDragOverPageId(page.id);
            }}
            onDrop={(e) => {
              if (!groupId || searchTerm !== '') return;
              e.preventDefault();
              e.stopPropagation();
              setDragOverPageId(null);
              if (!draggingPageId || draggingPageId === page.id) return;

              // 仅对自定义分组进行排序
              const groupPages = filteredPages.filter(p => p.groupId === groupId);
              const fromIndex = groupPages.findIndex(p => p.id === draggingPageId);
              const toIndex = groupPages.findIndex(p => p.id === page.id);
              if (fromIndex < 0 || toIndex < 0) return;
              const ordered = groupPages.map(p => p.id);
              const [moved] = ordered.splice(fromIndex, 1);
              ordered.splice(toIndex, 0, moved);
              onGroupReorderPages && onGroupReorderPages(groupId, ordered);
            }}
            onDragEnd={() => {
              setDraggingPageId(null);
              setDragOverPageId(null);
            }}
          >
            <div className="flex items-center space-x-2 min-w-0">
              <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span 
                className="font-medium text-sm truncate flex-1 min-w-0" 
                title={page.name}
              >
                {page.name}
              </span>
              {page.template && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex-shrink-0 whitespace-nowrap">
                  {page.template}
                </span>
              )}
            </div>
            
            {/* 悬停时显示的浮动按钮 */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-1 bg-white rounded-md shadow-sm border border-gray-200 p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onPageCopy(page);
                }}
                className="h-6 w-6 p-0 hover:bg-gray-100"
                title="复制页面"
              >
                <Copy className="w-3 h-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onPageDelete(page);
                }}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                title="删除页面"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            
            {page.updatedAt && (
              <div className="text-xs text-gray-400 mt-1">
                更新于 {new Date(page.updatedAt).toLocaleString()}
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => onPageCopy(page)}
          >
            <Copy className="mr-2 h-4 w-4" />
            复制页面
          </ContextMenuItem>
          <ContextMenuItem
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(page.id);
                // 可以添加toast提示
              } catch (err) {
                console.error('复制页面ID失败:', err);
              }
            }}
          >
            <Hash className="mr-2 h-4 w-4" />
            复制页面ID
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onPageDelete(page)}
          >
            <X className="mr-2 h-4 w-4" />
            删除页面
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  const renderGroupHeader = (
    groupId: string,
    title: string,
    icon: React.ReactNode,
    count: number,
    actions?: React.ReactNode
  ) => {
    const isExpanded = expandedNodes.has(groupId);
    
    return (
      <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
        <div
          className="flex items-center space-x-2 cursor-pointer flex-1"
          onClick={() => toggleExpanded(groupId)}
        >
          {isExpanded ? (
            <Minus className="w-4 h-4 text-gray-600" />
          ) : (
            <Plus className="w-4 h-4 text-gray-600" />
          )}
          {icon}
          <span className="font-medium text-sm">{title}</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {count}
          </span>
        </div>
        {actions && (
          <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="space-y-2"
      onClick={() => setContextMenu(null)}
    >
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="搜索页面..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 最近页面 */}
      {recentPages.length > 0 && (
        <div>
          {renderGroupHeader(
            'recent',
            '最近页面',
            <FileText className="w-4 h-4 text-blue-500" />,
            recentPages.length
          )}
          {expandedNodes.has('recent') && (
            <div className="space-y-2">
              {recentPages.map(p => renderPageCard(p))}
            </div>
          )}
        </div>
      )}

      {/* 自定义分组 */}
      <div>
        {renderGroupHeader(
          'custom-groups',
          '自定义分组',
          <Folder className="w-4 h-4 text-purple-500" />,
          groups.length,
          <Button
            variant="ghost"
            size="sm"
            onClick={onGroupCreate}
            className="h-6 w-6 p-0"
          >
            <Plus className="w-3 h-3" />
          </Button>
        )}
        {expandedNodes.has('custom-groups') && (
          <div className="ml-4 space-y-2">
            {groups.map(group => {
              const groupPages = customGroupedPages[group.id] || [];
              return (
                <div key={group.id}>
                  <div
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        groupId: group.id
                      });
                    }}
                  >
                    {renderGroupHeader(
                      `group-${group.id}`,
                      group.name,
                      <FolderOpen className="w-4 h-4" style={{ color: group.color || '#6b7280' }} />,
                      groupPages.length,
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPageCreateInGroup(group.id)}
                          className="h-6 w-6 p-0"
                          title="新增页面"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onGroupEdit(group)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onGroupDelete(group)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {expandedNodes.has(`group-${group.id}`) && (
                    <div className="space-y-2">
                  {groupPages.map(p => renderPageCard(p, group.id))}
                </div>
              )}
            </div>
          );
        })}
      </div>
        )}
      </div>

      {/* 按模板分组 */}
      <div>
        {renderGroupHeader(
          'templates',
          '按模板分组',
          <Folder className="w-4 h-4 text-green-500" />,
          Object.keys(templateGroups).length
        )}
        {expandedNodes.has('templates') && (
          <div className="ml-4 space-y-2">
            {Object.entries(templateGroups).map(([template, templatePages]) => (
              <div key={template}>
                {renderGroupHeader(
                  `template-${template}`,
                  template === 'default' ? '默认模板' : template,
                  <FileText className="w-4 h-4 text-gray-500" />,
                  templatePages.length
                )}
                {expandedNodes.has(`template-${template}`) && (
                  <div className="space-y-2">
                    {templatePages.map(p => renderPageCard(p))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer flex items-center space-x-2"
            onClick={() => {
              onPageCreateInGroup(contextMenu.groupId);
              setContextMenu(null);
            }}
          >
            <Plus className="w-4 h-4" />
            <span>新增页面</span>
          </div>
        </div>
      )}
    </div>
  );
}