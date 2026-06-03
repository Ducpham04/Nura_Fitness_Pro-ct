import TrainingView from './TrainingView';

// Tab "Tập luyện" gộp về 1 trang duy nhất: lịch tập + tổng quan chương trình
// + tạo kế hoạch AI đều nằm trong TrainingView (bỏ tab "Kế Hoạch Tập" trùng lặp).
export default function WorkoutTab() {
  return (
    <div className="w-full min-h-full text-white pt-2">
      <TrainingView />
    </div>
  );
}
