import { Metadata } from 'next';
import ExamTemplatesManager from '@/components/ExamTemplatesManager';

export const metadata: Metadata = {
  title: 'Goethe Exam Templates & Redemittel Matrix | Admin CMS',
  description: 'Manage official Goethe Schreiben and Sprechen templates and model answers.',
};

export default function ExamTemplatesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ExamTemplatesManager />
    </div>
  );
}
