import fs from 'fs';

function processIndustryAdmin() {
    let c = fs.readFileSync('src/pages/IndustryAdmin.tsx', 'utf8');

    // Remove VerificationBadge
    const badgeStart = c.indexOf('const VerificationBadge = ({ status }');
    if (badgeStart !== -1) {
        const badgeEnd = c.indexOf('};', badgeStart) + 2;
        c = c.slice(0, badgeStart) + c.slice(badgeEnd);
    }

    c = c.split("const isAllVerified = ![...inv, ...emp, ...loans, ...power, ...turn, ...csr, ...water].some(r => r.verificationStatus === 'pending');").join('');

    c = c.split('<TableHead>Status</TableHead>').join('');
    c = c.split('<TableHead>Verify Status</TableHead>').join('');
    
    // Using simple regex for table cells since there are 6 of them with different variable names
    c = c.replace(/<TableCell className="whitespace-nowrap"><VerificationBadge status=\{[a-z]\.verificationStatus\} \/><\/TableCell>/g, '');

    // Replace filters
    c = c.split("const vInv = inv.filter(x => x.verificationStatus === 'verified');").join("const vInv = inv;");
    c = c.split("const vTurn = turn.filter(x => x.verificationStatus === 'verified');").join("const vTurn = turn;");
    c = c.split("const vEmp = emp.filter(x => x.verificationStatus === 'verified');").join("const vEmp = emp;");
    c = c.split("const vPower = power.filter(x => x.verificationStatus === 'verified');").join("const vPower = power;");
    c = c.split("const vWater = water.filter(x => x.verificationStatus === 'verified');").join("const vWater = water;");
    c = c.split("const vLoans = loans.filter(x => x.verificationStatus === 'verified');").join("const vLoans = loans;");
    c = c.split("const vCsr = csr.filter(x => x.verificationStatus === 'verified');").join("const vCsr = csr;");

    fs.writeFileSync('src/pages/IndustryAdmin.tsx', c);
    console.log('Processed IndustryAdmin');
}

function processSipcotAdmin() {
    let c = fs.readFileSync('src/pages/SipcotAdmin.tsx', 'utf8');

    // Remove VerifyButton
    const badgeStart = c.indexOf('const VerifyButton = ({ status }');
    if (badgeStart !== -1) {
        const badgeEnd = c.indexOf('};', badgeStart) + 2;
        c = c.slice(0, badgeStart) + c.slice(badgeEnd);
    }
    
    // Remove handleVerifyAll
    const verifyAllStart = c.indexOf('  const handleVerifyAll = async');
    if (verifyAllStart !== -1) {
        const verifyAllEnd = c.indexOf('  };', verifyAllStart) + 4;
        c = c.slice(0, verifyAllStart) + c.slice(verifyAllEnd);
    }
    
    c = c.split('<TableHead className="whitespace-nowrap">Action</TableHead>').join('');
    c = c.replace(/<TableCell className="whitespace-nowrap"><VerifyButton status=\{[a-z]\.verificationStatus\} \/><\/TableCell>/g, '');

    // Remove hasPendingData definition block
    c = c.replace(/\s*const hasPendingData = d && \[\s*\.\.\.d\.inv, \.\.\.d\.emp, \.\.\.d\.loans, \.\.\.d\.power, \.\.\.d\.turn, \.\.\.d\.csr, \.\.\.d\.water\s*\]\.some\(r => r\.verificationStatus === 'pending'\);/g, '');
    
    // Remove the condition for rendering red dot
    c = c.replace(/\s*\{hasPendingData && \(\s*<div className="absolute top-1\.5 right-1\.5 h-2\.5 w-2\.5 bg-red-500 rounded-full border border-background shadow-sm z-10" title="Pending Verification" \/>\s*\)\}/g, '');

    // Replace filters
    c = c.replace(/\.filter\(x => x\.verificationStatus === 'verified'\)/g, '');

    fs.writeFileSync('src/pages/SipcotAdmin.tsx', c);
    console.log('Processed SipcotAdmin');
}

function processSuperAdmin() {
    let c = fs.readFileSync('src/pages/SuperAdmin.tsx', 'utf8');
    c = c.replace(/\.filter\(x => x\.verificationStatus === 'verified'\)/g, '');
    fs.writeFileSync('src/pages/SuperAdmin.tsx', c);
    console.log('Processed SuperAdmin');
}

function processSuperAdminAnalytics() {
    try {
        let c = fs.readFileSync('src/pages/SuperAdminAnalytics.tsx', 'utf8');
        c = c.replace(/\.filter\(x => x\.verificationStatus === 'verified'\)/g, '');
        fs.writeFileSync('src/pages/SuperAdminAnalytics.tsx', c);
        console.log('Processed SuperAdminAnalytics');
    } catch {}
}

processIndustryAdmin();
processSipcotAdmin();
processSuperAdmin();
processSuperAdminAnalytics();
