export default function Footer() {
  return (
    <footer className="border-t display:none" >
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-10 text-center sm:flex-row sm:text-left">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} 代码优化建议 • 为你的项目提供高质量的优化思路
        </p>
        <p className="text-xs text-muted-foreground">
          提示：告诉我你的技术栈与代码片段，我会给出更具体的优化建议
        </p>
      </div>
    </footer>
  );
}
