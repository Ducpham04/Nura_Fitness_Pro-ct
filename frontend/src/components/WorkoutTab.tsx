import TrainingView from './TrainingView';

// Tab "Tập luyện" gộp về 1 trang duy nhất: lịch tập + tổng quan chương trình
// + tạo kế hoạch AI đều nằm trong TrainingView (bỏ tab "Kế Hoạch Tập" trùng lặp).
export default function WorkoutTab() {
  return (
    <div className="mx-auto w-full max-w-3xl px-0 pb-6 pt-1 text-[#111827] sm:px-2">
      <TrainingView />
    </div>
  );
}
