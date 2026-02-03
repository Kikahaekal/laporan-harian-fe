import { Assessment, History } from "@mui/icons-material";
import { Link } from "react-router";

const Dashboard = () => {
  return (
    <div>
      <div>
        <p className="text-6xl font-bold mt-10">Selamat Datang</p>
        <p className="text-sm text-gray-400 font-semibold mt-2">Selamat beraktivitas dengan penuh ceria!</p>
      </div>
      <div className="bg-white shadow-xl flex justify-around py-10 mt-10 rounded-lg">
        <div className="flex items-center gap-4">
          <Assessment sx={{ fontSize: 90 }} className="text-purple-400" />
          <div>
            <Link to="/laporan" className="font-semibold hover:text-purple-500 transition-colors">Laporan Harian</Link>
            <p className="text-gray-400">Buat laporan harian anda sekarang</p>
          </div>
        </div>
        <div className="w-0.5 bg-gray-200 h-24 rounded-full"></div>
        <div className="flex items-center gap-4">
          <History sx={{ fontSize: 90 }} className="text-blue-400" />
          <div>
            <Link to="/rekap" className="font-semibold hover:text-blue-500 transition-colors">Rekap Harian</Link>
            <p className="text-gray-400">Cek rekapan laporan harian</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;